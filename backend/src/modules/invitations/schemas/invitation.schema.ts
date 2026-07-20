import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { InvitationStatus } from '../../../common/enums';

export type InvitationDocument = HydratedDocument<Invitation>;

@Schema({ timestamps: true })
export class Invitation {
  @Prop({ type: Types.ObjectId, ref: 'Minister', required: true, index: true })
  minister_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Event', required: true, index: true })
  event_id: Types.ObjectId;

  @Prop({ required: true })
  arrival_date: Date;

  @Prop({ required: true })
  departure_date: Date;

  // Auto-calculated from arrival/departure by the service when not supplied, but
  // stored as a plain editable field so a coordinator can override it — see brief
  // Section 2.
  @Prop({ required: true })
  number_of_days: number;

  @Prop({ required: true, trim: true })
  hotel_name: string;

  @Prop({ required: true, trim: true })
  hotel_address: string;

  @Prop({ trim: true })
  hotel_room_number?: string;

  @Prop({ type: [Date], default: [] })
  preaching_dates: Date[];

  // Denormalized convenience field — StatusLog is the source of truth for history.
  // Only ever changed via InvitationsService.updateStatus(), never the general update.
  @Prop({ required: true, enum: InvitationStatus, default: InvitationStatus.INVITED })
  status: InvitationStatus;
}

export const InvitationSchema = SchemaFactory.createForClass(Invitation);

// A minister can be invited to many events over time, but not twice to the *same*
// event — see InvitationsService for the same defense-in-depth pattern (unique index +
// service-level pre-check + 409 Conflict) used for Minister/Event/ProtocolMember.
InvitationSchema.index({ minister_id: 1, event_id: 1 }, { unique: true });
