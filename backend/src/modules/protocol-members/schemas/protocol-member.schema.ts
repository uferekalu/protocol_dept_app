import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ProtocolMemberRole } from '../../../common/enums';

export type ProtocolMemberDocument = HydratedDocument<ProtocolMember>;

@Schema({ timestamps: true })
export class ProtocolMember {
  @Prop({ required: true, trim: true })
  full_name: string;

  @Prop({ required: true, trim: true, unique: true })
  phone_number: string;

  @Prop({ required: true, enum: ProtocolMemberRole })
  role: ProtocolMemberRole;

  // Populated from Phase 1 onward (per backend/CLAUDE.md) even though login itself is
  // built in Phase 5, since Assignment already references ProtocolMember as the "user"
  // record. `select: false` keeps it out of query results by default; the toJSON
  // transform below is a second layer so it can never leak in an API response even if
  // a future auth query explicitly selects it back in.
  @Prop({ required: true, select: false })
  password_hash: string;
}

export const ProtocolMemberSchema = SchemaFactory.createForClass(ProtocolMember);

ProtocolMemberSchema.set('toJSON', {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (_doc, ret: any) => {
    delete ret.password_hash;
    return ret;
  },
});
