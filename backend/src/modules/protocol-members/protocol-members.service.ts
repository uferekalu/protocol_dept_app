import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import {
  ProtocolMember,
  ProtocolMemberDocument,
} from './schemas/protocol-member.schema';
import { CreateProtocolMemberDto } from './dto/create-protocol-member.dto';
import { UpdateProtocolMemberDto } from './dto/update-protocol-member.dto';

// Mongo/Mongoose duplicate-key error code, raised when a `unique` index is violated.
const MONGO_DUPLICATE_KEY_ERROR = 11000;
const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class ProtocolMembersService {
  constructor(
    @InjectModel(ProtocolMember.name)
    private protocolMemberModel: Model<ProtocolMemberDocument>,
  ) {}

  async create(
    createProtocolMemberDto: CreateProtocolMemberDto,
  ): Promise<ProtocolMemberDocument> {
    const existing = await this.protocolMemberModel
      .findOne({ phone_number: createProtocolMemberDto.phone_number })
      .exec();
    if (existing) {
      throw new ConflictException(
        `A protocol member with phone number ${createProtocolMemberDto.phone_number} already exists (${existing.full_name})`,
      );
    }

    const { password, ...rest } = createProtocolMemberDto;
    const password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    try {
      return await this.protocolMemberModel.create({ ...rest, password_hash });
    } catch (error) {
      throw this.translateDuplicateKeyError(error, createProtocolMemberDto.phone_number);
    }
  }

  findAll(): Promise<ProtocolMemberDocument[]> {
    return this.protocolMemberModel.find().sort({ full_name: 1 }).exec();
  }

  // Used only by AuthService.signup() to decide whether the very first account ever
  // created becomes ADMIN (see that method's comment) — nothing else needs a raw count.
  count(): Promise<number> {
    return this.protocolMemberModel.countDocuments().exec();
  }

  // Used only by AuthService.login() — the schema's `select: false` on password_hash
  // keeps it out of every other query by default, so login is the one deliberate,
  // narrow place that opts back in.
  findByPhoneNumberWithPassword(phoneNumber: string): Promise<ProtocolMemberDocument | null> {
    return this.protocolMemberModel
      .findOne({ phone_number: phoneNumber })
      .select('+password_hash')
      .exec();
  }

  // Used only by AuthService.changePassword() — same select:false opt-in pattern as
  // findByPhoneNumberWithPassword(), narrowed to "the currently authenticated user's
  // own record" by the caller (never exposed as a way to fetch anyone else's hash).
  findByIdWithPassword(id: string): Promise<ProtocolMemberDocument | null> {
    return this.protocolMemberModel.findById(id).select('+password_hash').exec();
  }

  // Used only by AuthService.forgotPassword() to check whether an account exists for
  // the given phone number before generating/sending an OTP — deliberately returns
  // null rather than throwing, so the caller can respond identically either way and
  // never reveal whether a phone number has an account.
  findByPhoneNumber(phoneNumber: string): Promise<ProtocolMemberDocument | null> {
    return this.protocolMemberModel.findOne({ phone_number: phoneNumber }).exec();
  }

  // Used only by AuthService.resetPassword() — same select:false opt-in pattern as
  // findByPhoneNumberWithPassword(), scoped to the reset-OTP fields instead.
  findByPhoneNumberWithResetOtp(phoneNumber: string): Promise<ProtocolMemberDocument | null> {
    return this.protocolMemberModel
      .findOne({ phone_number: phoneNumber })
      .select('+reset_otp_hash +reset_otp_expires_at')
      .exec();
  }

  // The only path allowed to write reset_otp_hash/reset_otp_expires_at — see
  // AuthService.forgotPassword(). A fresh call always overwrites any prior unused OTP,
  // so only the most recently requested code is ever valid.
  async setResetOtp(id: string, otpHash: string, expiresAt: Date): Promise<void> {
    const result = await this.protocolMemberModel
      .findByIdAndUpdate(id, { reset_otp_hash: otpHash, reset_otp_expires_at: expiresAt })
      .exec();
    if (!result) {
      throw new NotFoundException(`Protocol member ${id} not found`);
    }
  }

  // Called once an OTP has been consumed (or superseded) — see
  // AuthService.resetPassword() — so a captured/guessed code is never replayable.
  async clearResetOtp(id: string): Promise<void> {
    const result = await this.protocolMemberModel
      .findByIdAndUpdate(id, { $unset: { reset_otp_hash: 1, reset_otp_expires_at: 1 } })
      .exec();
    if (!result) {
      throw new NotFoundException(`Protocol member ${id} not found`);
    }
  }

  async findOne(id: string): Promise<ProtocolMemberDocument> {
    const member = await this.protocolMemberModel.findById(id).exec();
    if (!member) {
      throw new NotFoundException(`Protocol member ${id} not found`);
    }
    return member;
  }

  async update(
    id: string,
    updateProtocolMemberDto: UpdateProtocolMemberDto,
  ): Promise<ProtocolMemberDocument> {
    if (updateProtocolMemberDto.phone_number) {
      const existing = await this.protocolMemberModel
        .findOne({
          phone_number: updateProtocolMemberDto.phone_number,
          _id: { $ne: id },
        })
        .exec();
      if (existing) {
        throw new ConflictException(
          `A protocol member with phone number ${updateProtocolMemberDto.phone_number} already exists (${existing.full_name})`,
        );
      }
    }

    let member: ProtocolMemberDocument | null;
    try {
      member = await this.protocolMemberModel
        .findByIdAndUpdate(id, updateProtocolMemberDto, { new: true })
        .exec();
    } catch (error) {
      throw this.translateDuplicateKeyError(error, updateProtocolMemberDto.phone_number);
    }
    if (!member) {
      throw new NotFoundException(`Protocol member ${id} not found`);
    }
    return member;
  }

  // The only two paths allowed to change image_url — see
  // ProtocolMembersController.uploadPhoto()/removePhoto(). Kept separate from the
  // general update() so a Cloudinary secure_url set here never has to satisfy
  // UpdateProtocolMemberDto's @IsUrl() validation on a value we generated ourselves,
  // and so removal can $unset the field outright instead of fighting `undefined` being
  // stripped from a Mongoose update payload.
  async setPhoto(id: string, imageUrl: string): Promise<ProtocolMemberDocument> {
    const member = await this.protocolMemberModel
      .findByIdAndUpdate(id, { image_url: imageUrl }, { new: true })
      .exec();
    if (!member) {
      throw new NotFoundException(`Protocol member ${id} not found`);
    }
    return member;
  }

  async removePhoto(id: string): Promise<ProtocolMemberDocument> {
    const member = await this.protocolMemberModel
      .findByIdAndUpdate(id, { $unset: { image_url: 1 } }, { new: true })
      .exec();
    if (!member) {
      throw new NotFoundException(`Protocol member ${id} not found`);
    }
    return member;
  }

  // The only path allowed to change password_hash — see AuthService.changePassword(),
  // which does the "must differ from your current password" comparison before calling
  // this. Never exposed via the general update() above (UpdateProtocolMemberDto has no
  // password field).
  async updatePassword(id: string, newPasswordHash: string): Promise<void> {
    const result = await this.protocolMemberModel
      .findByIdAndUpdate(id, { password_hash: newPasswordHash })
      .exec();
    if (!result) {
      throw new NotFoundException(`Protocol member ${id} not found`);
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.protocolMemberModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Protocol member ${id} not found`);
    }
  }

  // Defense in depth: the pre-checks above prevent duplicates under normal load, but two
  // requests can still race between the check and the write. The unique index is the
  // real guarantee; this just turns Mongo's raw E11000 into a clean, client-friendly 409.
  private translateDuplicateKeyError(error: unknown, phoneNumber?: string): Error {
    const isDuplicateKeyError =
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: number }).code === MONGO_DUPLICATE_KEY_ERROR;

    if (isDuplicateKeyError) {
      return new ConflictException(
        phoneNumber
          ? `A protocol member with phone number ${phoneNumber} already exists`
          : 'A protocol member with these details already exists',
      );
    }
    return error as Error;
  }
}
