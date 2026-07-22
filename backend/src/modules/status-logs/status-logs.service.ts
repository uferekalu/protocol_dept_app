import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StatusLog, StatusLogDocument } from './schemas/status-log.schema';
import { InvitationStatus } from '../../common/enums';

export interface CreateStatusLogInput {
  invitation_id: string;
  status: InvitationStatus;
  updated_by: string;
  notes?: string;
}

// Intentionally has no public create/update/delete endpoint — see the schema's
// module-level comment. `create` is called only by InvitationsService as part of a
// guarded status transition, never exposed directly on the controller.
@Injectable()
export class StatusLogsService {
  constructor(
    @InjectModel(StatusLog.name) private statusLogModel: Model<StatusLogDocument>,
  ) {}

  create(input: CreateStatusLogInput): Promise<StatusLogDocument> {
    return this.statusLogModel.create(input);
  }

  findByInvitation(invitationId: string): Promise<StatusLogDocument[]> {
    return this.statusLogModel
      .find({ invitation_id: invitationId })
      .sort({ timestamp: -1 })
      .exec();
  }

  // Used only by ReportsService — every log across every invitation, unfiltered, so it
  // can compute "most active protocol member" and "average pickup-to-check-in time" in
  // application code rather than a Mongo aggregation pipeline. Fine at this app's scale
  // (a single department's event history, not a high-volume dataset).
  findAll(): Promise<StatusLogDocument[]> {
    return this.statusLogModel.find().sort({ timestamp: 1 }).exec();
  }

  async findOne(id: string): Promise<StatusLogDocument> {
    const log = await this.statusLogModel.findById(id).exec();
    if (!log) {
      throw new NotFoundException(`Status log ${id} not found`);
    }
    return log;
  }
}
