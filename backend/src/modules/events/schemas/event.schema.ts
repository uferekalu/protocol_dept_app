import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EventDocument = HydratedDocument<Event>;

@Schema({ timestamps: true })
export class Event {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, index: true })
  start_date: Date;

  @Prop({ required: true })
  end_date: Date;

  @Prop({ required: true, trim: true })
  venue: string;

  @Prop({ trim: true })
  description?: string;
}

export const EventSchema = SchemaFactory.createForClass(Event);

// An identical name + start date is almost certainly an accidental double-submit,
// not a deliberate second event — see MinistersService for the same defense-in-depth
// pattern (unique index + service-level pre-check + 409 Conflict).
EventSchema.index({ name: 1, start_date: 1 }, { unique: true });
