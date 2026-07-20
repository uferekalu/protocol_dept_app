import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MinisterDocument = HydratedDocument<Minister>;

@Schema({ timestamps: true })
export class Minister {
  @Prop({ required: true, trim: true })
  full_name: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true, unique: true })
  phone_number: string;

  @Prop({ trim: true, lowercase: true })
  email?: string;

  @Prop({ required: true, trim: true })
  home_church_or_parish: string;

  @Prop()
  photo?: string;

  @Prop()
  notes?: string;
}

export const MinisterSchema = SchemaFactory.createForClass(Minister);
