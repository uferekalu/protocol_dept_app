import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invitation, InvitationDocument } from './schemas/invitation.schema';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UpdateInvitationDto } from './dto/update-invitation.dto';
import { UpdateInvitationStatusDto } from './dto/update-invitation-status.dto';
import { MinistersService } from '../ministers/ministers.service';
import { EventsService } from '../events/events.service';
import { ProtocolMembersService } from '../protocol-members/protocol-members.service';
import { StatusLogsService } from '../status-logs/status-logs.service';
import { InvitationStatus, VALID_STATUS_TRANSITIONS } from '../../common/enums';

// Mongo/Mongoose duplicate-key error code, raised when a `unique` index is violated.
const MONGO_DUPLICATE_KEY_ERROR = 11000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class InvitationsService {
  constructor(
    @InjectModel(Invitation.name) private invitationModel: Model<InvitationDocument>,
    private ministersService: MinistersService,
    private eventsService: EventsService,
    private protocolMembersService: ProtocolMembersService,
    private statusLogsService: StatusLogsService,
  ) {}

  async create(createInvitationDto: CreateInvitationDto): Promise<InvitationDocument> {
    // Referential integrity: a bad id 404s here instead of silently creating a
    // dangling reference.
    await this.ministersService.findOne(createInvitationDto.minister_id);
    await this.eventsService.findOne(createInvitationDto.event_id);

    this.assertValidDateRange(
      createInvitationDto.arrival_date,
      createInvitationDto.departure_date,
    );
    this.assertPreachingDatesWithinStay(
      createInvitationDto.preaching_dates ?? [],
      createInvitationDto.arrival_date,
      createInvitationDto.departure_date,
    );

    const existing = await this.invitationModel
      .findOne({
        minister_id: createInvitationDto.minister_id,
        event_id: createInvitationDto.event_id,
      })
      .exec();
    if (existing) {
      throw new ConflictException(
        'This minister already has an invitation for this event',
      );
    }

    const number_of_days =
      createInvitationDto.number_of_days ??
      this.calculateNumberOfDays(
        createInvitationDto.arrival_date,
        createInvitationDto.departure_date,
      );

    try {
      return await this.invitationModel.create({
        ...createInvitationDto,
        number_of_days,
        status: InvitationStatus.INVITED,
      });
    } catch (error) {
      throw this.translateDuplicateKeyError(error);
    }
  }

  // Populated with the full Minister/Event documents (not raw ids) — these two
  // endpoints exist to be displayed (list screens, the dashboard), unlike findOne()
  // below, which stays unpopulated because other services rely on it for raw-ObjectId
  // comparisons (see update()'s conflict check, AssignmentsService, etc.).
  //
  // Optional ministerId filter powers the Minister Profile screen's invitation
  // history (brief Section 5) — a query param on the existing collection endpoint,
  // not a nested route, since MinistersModule can't depend on InvitationsModule
  // without a circular dependency (same reasoning as the Assignments module's nested
  // controllers).
  findAll(ministerId?: string): Promise<InvitationDocument[]> {
    return this.invitationModel
      .find(ministerId ? { minister_id: ministerId } : {})
      .populate('minister_id')
      .populate('event_id')
      .sort({ arrival_date: -1 })
      .exec();
  }

  // Powers the "Currently Hosting" dashboard — any invitation not yet at the final
  // status, per backend/CLAUDE.md's suggested GET /invitations/currently-hosting.
  findCurrentlyHosting(): Promise<InvitationDocument[]> {
    return this.invitationModel
      .find({ status: { $ne: InvitationStatus.DEPARTED_TRIP_COMPLETED } })
      .populate('minister_id')
      .populate('event_id')
      .sort({ arrival_date: 1 })
      .exec();
  }

  async findOne(id: string): Promise<InvitationDocument> {
    const invitation = await this.invitationModel.findById(id).exec();
    if (!invitation) {
      throw new NotFoundException(`Invitation ${id} not found`);
    }
    return invitation;
  }

  async update(
    id: string,
    updateInvitationDto: UpdateInvitationDto,
  ): Promise<InvitationDocument> {
    const existing = await this.findOne(id);

    if (updateInvitationDto.minister_id) {
      await this.ministersService.findOne(updateInvitationDto.minister_id);
    }
    if (updateInvitationDto.event_id) {
      await this.eventsService.findOne(updateInvitationDto.event_id);
    }

    const effectiveArrival =
      updateInvitationDto.arrival_date ?? existing.arrival_date.toISOString();
    const effectiveDeparture =
      updateInvitationDto.departure_date ?? existing.departure_date.toISOString();
    this.assertValidDateRange(effectiveArrival, effectiveDeparture);

    const effectivePreachingDates =
      updateInvitationDto.preaching_dates ??
      existing.preaching_dates.map((date) => date.toISOString());
    this.assertPreachingDatesWithinStay(
      effectivePreachingDates,
      effectiveArrival,
      effectiveDeparture,
    );

    if (updateInvitationDto.minister_id || updateInvitationDto.event_id) {
      const effectiveMinisterId =
        updateInvitationDto.minister_id ?? existing.minister_id.toString();
      const effectiveEventId = updateInvitationDto.event_id ?? existing.event_id.toString();
      const conflict = await this.invitationModel
        .findOne({
          _id: { $ne: id },
          minister_id: effectiveMinisterId,
          event_id: effectiveEventId,
        })
        .exec();
      if (conflict) {
        throw new ConflictException(
          'This minister already has an invitation for this event',
        );
      }
    }

    const update: Record<string, unknown> = { ...updateInvitationDto };
    if (updateInvitationDto.arrival_date || updateInvitationDto.departure_date) {
      update.number_of_days =
        updateInvitationDto.number_of_days ??
        this.calculateNumberOfDays(effectiveArrival, effectiveDeparture);
    }

    let invitation: InvitationDocument | null;
    try {
      invitation = await this.invitationModel
        .findByIdAndUpdate(id, update, { new: true })
        .exec();
    } catch (error) {
      throw this.translateDuplicateKeyError(error);
    }
    if (!invitation) {
      throw new NotFoundException(`Invitation ${id} not found`);
    }
    return invitation;
  }

  async remove(id: string): Promise<void> {
    const result = await this.invitationModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Invitation ${id} not found`);
    }
  }

  // The guarded status-transition endpoint — see backend/CLAUDE.md's "Status workflow
  // — implementation requirement". Never call invitationModel.findByIdAndUpdate with a
  // raw `status` from elsewhere in this service; this is the only path allowed to
  // change it.
  async updateStatus(
    id: string,
    updateInvitationStatusDto: UpdateInvitationStatusDto,
  ): Promise<InvitationDocument> {
    const invitation = await this.findOne(id);
    await this.protocolMembersService.findOne(updateInvitationStatusDto.updated_by);

    const allowedNextStatuses = VALID_STATUS_TRANSITIONS[invitation.status];
    if (!allowedNextStatuses.includes(updateInvitationStatusDto.status)) {
      const nextOptions = allowedNextStatuses.length
        ? allowedNextStatuses.join(', ')
        : 'none — this invitation has already completed its trip';
      throw new BadRequestException(
        `Cannot transition from ${invitation.status} to ${updateInvitationStatusDto.status}. Valid next status(es): ${nextOptions}`,
      );
    }

    // Log before flipping the denormalized status field — see PR description for why
    // this ordering is deliberate (no DB transaction backs this, since a standalone
    // MongoDB instance doesn't support them; log-ahead-of-status is the safer failure
    // mode for an accountability system than status-ahead-of-log).
    await this.statusLogsService.create({
      invitation_id: id,
      status: updateInvitationStatusDto.status,
      updated_by: updateInvitationStatusDto.updated_by,
      notes: updateInvitationStatusDto.notes,
    });

    const updated = await this.invitationModel
      .findByIdAndUpdate(id, { status: updateInvitationStatusDto.status }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException(`Invitation ${id} not found`);
    }
    return updated;
  }

  private calculateNumberOfDays(
    arrivalDate: string | Date,
    departureDate: string | Date,
  ): number {
    const days = Math.round(
      (new Date(departureDate).getTime() - new Date(arrivalDate).getTime()) / MS_PER_DAY,
    );
    return days + 1;
  }

  private assertValidDateRange(
    arrivalDate: string | Date,
    departureDate: string | Date,
  ): void {
    if (new Date(departureDate) < new Date(arrivalDate)) {
      throw new BadRequestException('departure_date must be on or after arrival_date');
    }
  }

  private assertPreachingDatesWithinStay(
    preachingDates: (string | Date)[],
    arrivalDate: string | Date,
    departureDate: string | Date,
  ): void {
    const arrival = new Date(arrivalDate).getTime();
    const departure = new Date(departureDate).getTime();
    const outOfRange = preachingDates.find((date) => {
      const time = new Date(date).getTime();
      return time < arrival || time > departure;
    });
    if (outOfRange) {
      throw new BadRequestException(
        `preaching date ${new Date(outOfRange).toISOString().slice(0, 10)} falls outside the invitation's stay (${new Date(
          arrivalDate,
        )
          .toISOString()
          .slice(0, 10)} to ${new Date(departureDate).toISOString().slice(0, 10)})`,
      );
    }
  }

  // Defense in depth: the pre-checks above prevent duplicates under normal load, but two
  // requests can still race between the check and the write. The unique index is the
  // real guarantee; this just turns Mongo's raw E11000 into a clean, client-friendly 409.
  private translateDuplicateKeyError(error: unknown): Error {
    const isDuplicateKeyError =
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: number }).code === MONGO_DUPLICATE_KEY_ERROR;

    if (isDuplicateKeyError) {
      return new ConflictException(
        'This minister already has an invitation for this event',
      );
    }
    return error as Error;
  }
}
