import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { InvitationStatus } from '../../../common/enums';

export type StatusLogDocument = HydratedDocument<StatusLog>;

// Append-only audit trail — see StatusLogsService. No document in this collection is
// ever updated or deleted; entries are only ever created internally by
// InvitationsService as part of a guarded status transition.
@Schema()
export class StatusLog {
  @Prop({ type: Types.ObjectId, ref: 'Invitation', required: true, index: true })
  invitation_id: Types.ObjectId;

  @Prop({ required: true, enum: InvitationStatus })
  status: InvitationStatus;

  @Prop({ required: true, default: Date.now })
  timestamp: Date;

  @Prop({ type: Types.ObjectId, ref: 'ProtocolMember', required: true })
  updated_by: Types.ObjectId;

  @Prop()
  notes?: string;
}

export const StatusLogSchema = SchemaFactory.createForClass(StatusLog);
