import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AssignmentStatus, AssignmentType } from '../../../common/enums';

export type AssignmentDocument = HydratedDocument<Assignment>;

@Schema({ timestamps: true })
export class Assignment {
  @Prop({ type: Types.ObjectId, ref: 'Invitation', required: true, index: true })
  invitation_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ProtocolMember', required: true, index: true })
  protocol_member_id: Types.ObjectId;

  @Prop({ required: true, enum: AssignmentType })
  assignment_type: AssignmentType;

  @Prop({ required: true })
  scheduled_time: Date;

  // Only ever set by AssignmentsService.updateStatus() when status moves to COMPLETED —
  // never accepted directly from a client, so the timestamp is authentic.
  @Prop()
  actual_time_completed?: Date;

  @Prop({ required: true, enum: AssignmentStatus, default: AssignmentStatus.PENDING })
  status: AssignmentStatus;

  @Prop({ trim: true })
  notes?: string;
}

export const AssignmentSchema = SchemaFactory.createForClass(Assignment);

// HOTEL_TO_VENUE / VENUE_TO_HOTEL legitimately repeat once per preaching day (brief
// Section 3's sub-cycle), so uniqueness can't be just (invitation_id, assignment_type) —
// the same leg type at the same scheduled time is what actually indicates an accidental
// double-submit. See AssignmentsService for the same defense-in-depth pattern used
// elsewhere in this codebase.
AssignmentSchema.index(
  { invitation_id: 1, assignment_type: 1, scheduled_time: 1 },
  { unique: true },
);
