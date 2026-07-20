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

    const { password, ...rest } = updateProtocolMemberDto;
    const update: Record<string, unknown> = { ...rest };
    if (password) {
      update.password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    }

    let member: ProtocolMemberDocument | null;
    try {
      member = await this.protocolMemberModel
        .findByIdAndUpdate(id, update, { new: true })
        .exec();
    } catch (error) {
      throw this.translateDuplicateKeyError(error, updateProtocolMemberDto.phone_number);
    }
    if (!member) {
      throw new NotFoundException(`Protocol member ${id} not found`);
    }
    return member;
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
