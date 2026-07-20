import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Minister, MinisterDocument } from './schemas/minister.schema';
import { CreateMinisterDto } from './dto/create-minister.dto';
import { UpdateMinisterDto } from './dto/update-minister.dto';

// Mongo/Mongoose duplicate-key error code, raised when a `unique` index is violated.
const MONGO_DUPLICATE_KEY_ERROR = 11000;

@Injectable()
export class MinistersService {
  constructor(
    @InjectModel(Minister.name) private ministerModel: Model<MinisterDocument>,
  ) {}

  async create(createMinisterDto: CreateMinisterDto): Promise<MinisterDocument> {
    const existing = await this.ministerModel
      .findOne({ phone_number: createMinisterDto.phone_number })
      .exec();
    if (existing) {
      throw new ConflictException(
        `A minister with phone number ${createMinisterDto.phone_number} already exists (${existing.full_name})`,
      );
    }

    try {
      return await this.ministerModel.create(createMinisterDto);
    } catch (error) {
      throw this.translateDuplicateKeyError(error, createMinisterDto.phone_number);
    }
  }

  findAll(): Promise<MinisterDocument[]> {
    return this.ministerModel.find().sort({ full_name: 1 }).exec();
  }

  async findOne(id: string): Promise<MinisterDocument> {
    const minister = await this.ministerModel.findById(id).exec();
    if (!minister) {
      throw new NotFoundException(`Minister ${id} not found`);
    }
    return minister;
  }

  async update(
    id: string,
    updateMinisterDto: UpdateMinisterDto,
  ): Promise<MinisterDocument> {
    if (updateMinisterDto.phone_number) {
      const existing = await this.ministerModel
        .findOne({ phone_number: updateMinisterDto.phone_number, _id: { $ne: id } })
        .exec();
      if (existing) {
        throw new ConflictException(
          `A minister with phone number ${updateMinisterDto.phone_number} already exists (${existing.full_name})`,
        );
      }
    }

    let minister: MinisterDocument | null;
    try {
      minister = await this.ministerModel
        .findByIdAndUpdate(id, updateMinisterDto, { new: true })
        .exec();
    } catch (error) {
      throw this.translateDuplicateKeyError(error, updateMinisterDto.phone_number);
    }
    if (!minister) {
      throw new NotFoundException(`Minister ${id} not found`);
    }
    return minister;
  }

  async remove(id: string): Promise<void> {
    const result = await this.ministerModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Minister ${id} not found`);
    }
  }

  // Defense in depth: the pre-checks above prevent duplicates under normal load, but two
  // requests can still race between the check and the write. The unique index is the real
  // guarantee; this just turns Mongo's raw E11000 into a clean, client-friendly 409.
  private translateDuplicateKeyError(error: unknown, phoneNumber?: string): Error {
    const isDuplicateKeyError =
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: number }).code === MONGO_DUPLICATE_KEY_ERROR;

    if (isDuplicateKeyError) {
      return new ConflictException(
        phoneNumber
          ? `A minister with phone number ${phoneNumber} already exists`
          : 'A minister with these details already exists',
      );
    }
    return error as Error;
  }
}
