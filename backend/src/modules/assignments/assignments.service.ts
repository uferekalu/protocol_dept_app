import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Assignment, AssignmentDocument } from './schemas/assignment.schema';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { UpdateAssignmentStatusDto } from './dto/update-assignment-status.dto';
import { InvitationsService } from '../invitations/invitations.service';
import { ProtocolMembersService } from '../protocol-members/protocol-members.service';
import { AssignmentStatus, VALID_ASSIGNMENT_TRANSITIONS } from '../../common/enums';

// Mongo/Mongoose duplicate-key error code, raised when a `unique` index is violated.
const MONGO_DUPLICATE_KEY_ERROR = 11000;

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectModel(Assignment.name) private assignmentModel: Model<AssignmentDocument>,
    private invitationsService: InvitationsService,
    private protocolMembersService: ProtocolMembersService,
  ) {}

  async create(createAssignmentDto: CreateAssignmentDto): Promise<AssignmentDocument> {
    // Referential integrity: a bad id 404s here instead of silently creating a
    // dangling reference.
    const invitation = await this.invitationsService.findOne(
      createAssignmentDto.invitation_id,
    );
    await this.protocolMembersService.findOne(createAssignmentDto.protocol_member_id);

    this.assertScheduledTimeWithinStay(
      createAssignmentDto.scheduled_time,
      invitation.arrival_date,
      invitation.departure_date,
    );

    const existing = await this.assignmentModel
      .findOne({
        invitation_id: createAssignmentDto.invitation_id,
        assignment_type: createAssignmentDto.assignment_type,
        scheduled_time: new Date(createAssignmentDto.scheduled_time),
      })
      .exec();
    if (existing) {
      throw new ConflictException(
        `An assignment of type ${createAssignmentDto.assignment_type} already exists for this invitation at this time`,
      );
    }

    try {
      return await this.assignmentModel.create({
        ...createAssignmentDto,
        status: AssignmentStatus.PENDING,
      });
    } catch (error) {
      throw this.translateDuplicateKeyError(error, createAssignmentDto.assignment_type);
    }
  }

  findAll(): Promise<AssignmentDocument[]> {
    return this.assignmentModel.find().sort({ scheduled_time: 1 }).exec();
  }

  // Powers the "Assignment Board" screen (brief Section 5).
  findByInvitation(invitationId: string): Promise<AssignmentDocument[]> {
    return this.assignmentModel
      .find({ invitation_id: invitationId })
      .sort({ scheduled_time: 1 })
      .exec();
  }

  // Powers "My Assignments" (brief Section 5 / backend/CLAUDE.md).
  async findByProtocolMember(protocolMemberId: string): Promise<AssignmentDocument[]> {
    await this.protocolMembersService.findOne(protocolMemberId);
    return this.assignmentModel
      .find({ protocol_member_id: protocolMemberId })
      .sort({ scheduled_time: 1 })
      .exec();
  }

  async findOne(id: string): Promise<AssignmentDocument> {
    const assignment = await this.assignmentModel.findById(id).exec();
    if (!assignment) {
      throw new NotFoundException(`Assignment ${id} not found`);
    }
    return assignment;
  }

  async update(
    id: string,
    updateAssignmentDto: UpdateAssignmentDto,
  ): Promise<AssignmentDocument> {
    const existing = await this.findOne(id);

    if (updateAssignmentDto.protocol_member_id) {
      await this.protocolMembersService.findOne(updateAssignmentDto.protocol_member_id);
    }

    const effectiveInvitationId =
      updateAssignmentDto.invitation_id ?? existing.invitation_id.toString();
    const effectiveScheduledTime =
      updateAssignmentDto.scheduled_time ?? existing.scheduled_time.toISOString();

    if (updateAssignmentDto.invitation_id || updateAssignmentDto.scheduled_time) {
      const invitation = await this.invitationsService.findOne(effectiveInvitationId);
      this.assertScheduledTimeWithinStay(
        effectiveScheduledTime,
        invitation.arrival_date,
        invitation.departure_date,
      );
    }

    const effectiveAssignmentType =
      updateAssignmentDto.assignment_type ?? existing.assignment_type;
    if (
      updateAssignmentDto.invitation_id ||
      updateAssignmentDto.assignment_type ||
      updateAssignmentDto.scheduled_time
    ) {
      const conflict = await this.assignmentModel
        .findOne({
          _id: { $ne: id },
          invitation_id: effectiveInvitationId,
          assignment_type: effectiveAssignmentType,
          scheduled_time: new Date(effectiveScheduledTime),
        })
        .exec();
      if (conflict) {
        throw new ConflictException(
          `An assignment of type ${effectiveAssignmentType} already exists for this invitation at this time`,
        );
      }
    }

    let assignment: AssignmentDocument | null;
    try {
      assignment = await this.assignmentModel
        .findByIdAndUpdate(id, updateAssignmentDto, { new: true })
        .exec();
    } catch (error) {
      throw this.translateDuplicateKeyError(error, effectiveAssignmentType);
    }
    if (!assignment) {
      throw new NotFoundException(`Assignment ${id} not found`);
    }
    return assignment;
  }

  async remove(id: string): Promise<void> {
    const result = await this.assignmentModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Assignment ${id} not found`);
    }
  }

  // The guarded status-transition endpoint — mirrors InvitationsService.updateStatus().
  // Never set `status` or `actual_time_completed` from anywhere else in this service.
  async updateStatus(
    id: string,
    updateAssignmentStatusDto: UpdateAssignmentStatusDto,
  ): Promise<AssignmentDocument> {
    const assignment = await this.findOne(id);

    const allowedNextStatuses = VALID_ASSIGNMENT_TRANSITIONS[assignment.status];
    if (!allowedNextStatuses.includes(updateAssignmentStatusDto.status)) {
      const nextOptions = allowedNextStatuses.length
        ? allowedNextStatuses.join(', ')
        : 'none — this assignment is already completed';
      throw new BadRequestException(
        `Cannot transition from ${assignment.status} to ${updateAssignmentStatusDto.status}. Valid next status(es): ${nextOptions}`,
      );
    }

    const update: Record<string, unknown> = { status: updateAssignmentStatusDto.status };
    if (updateAssignmentStatusDto.notes !== undefined) {
      update.notes = updateAssignmentStatusDto.notes;
    }
    // "Mark assignment as completed with timestamp" (brief Section 4C) — the system's
    // clock, not a client-supplied value, so the timestamp is authentic.
    if (updateAssignmentStatusDto.status === AssignmentStatus.COMPLETED) {
      update.actual_time_completed = new Date();
    }

    const updated = await this.assignmentModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Assignment ${id} not found`);
    }
    return updated;
  }

  // Compares by calendar date only, not exact millisecond — a scheduled_time on the
  // departure day itself (e.g. an afternoon airport drop-off) is valid even though
  // arrival_date/departure_date are stored at midnight.
  private assertScheduledTimeWithinStay(
    scheduledTime: string | Date,
    arrivalDate: Date,
    departureDate: Date,
  ): void {
    const scheduledDateOnly = new Date(scheduledTime).toISOString().slice(0, 10);
    const arrivalDateOnly = arrivalDate.toISOString().slice(0, 10);
    const departureDateOnly = departureDate.toISOString().slice(0, 10);
    if (scheduledDateOnly < arrivalDateOnly || scheduledDateOnly > departureDateOnly) {
      throw new BadRequestException(
        `scheduled_time falls outside the invitation's stay (${arrivalDateOnly} to ${departureDateOnly})`,
      );
    }
  }

  // Defense in depth: the pre-checks above prevent duplicates under normal load, but two
  // requests can still race between the check and the write. The unique index is the
  // real guarantee; this just turns Mongo's raw E11000 into a clean, client-friendly 409.
  private translateDuplicateKeyError(error: unknown, assignmentType?: string): Error {
    const isDuplicateKeyError =
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: number }).code === MONGO_DUPLICATE_KEY_ERROR;

    if (isDuplicateKeyError) {
      return new ConflictException(
        assignmentType
          ? `An assignment of type ${assignmentType} already exists for this invitation at this time`
          : 'An assignment with these details already exists',
      );
    }
    return error as Error;
  }
}
