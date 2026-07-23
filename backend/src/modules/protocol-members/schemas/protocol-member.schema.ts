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

  // Optional — a member may add one to their own profile; never required for sign-up.
  @Prop({ trim: true, lowercase: true })
  email?: string;

  // Optional Cloudinary URL for a profile photo. The upload UI/widget is not built yet
  // (pending a Cloudinary account) — this field just makes the member directory/profile
  // screens' "image if uploaded, else avatar icon" fallback logic ready for it.
  @Prop({ trim: true })
  image_url?: string;

  @Prop({ required: true, enum: ProtocolMemberRole })
  role: ProtocolMemberRole;

  // Populated from Phase 1 onward (per backend/CLAUDE.md) even though login itself is
  // built in Phase 5, since Assignment already references ProtocolMember as the "user"
  // record. `select: false` keeps it out of query results by default; the toJSON
  // transform below is a second layer so it can never leak in an API response even if
  // a future auth query explicitly selects it back in.
  @Prop({ required: true, select: false })
  password_hash: string;

  // Forgot-password OTP (AuthService.forgotPassword()/resetPassword()) — same
  // select:false + never-in-toJSON pattern as password_hash. Hashed, not stored raw, and
  // cleared (both fields) the moment it's used or superseded by a newer request, so a
  // captured value is never replayable.
  @Prop({ select: false })
  reset_otp_hash?: string;

  @Prop({ select: false })
  reset_otp_expires_at?: Date;
}

export const ProtocolMemberSchema = SchemaFactory.createForClass(ProtocolMember);

ProtocolMemberSchema.set('toJSON', {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (_doc, ret: any) => {
    delete ret.password_hash;
    delete ret.reset_otp_hash;
    delete ret.reset_otp_expires_at;
    return ret;
  },
});
