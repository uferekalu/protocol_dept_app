import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

// Mongo/Mongoose duplicate-key error code, raised when a `unique` index is violated.
const MONGO_DUPLICATE_KEY_ERROR = 11000;

@Injectable()
export class EventsService {
  constructor(@InjectModel(Event.name) private eventModel: Model<EventDocument>) {}

  async create(createEventDto: CreateEventDto): Promise<EventDocument> {
    this.assertValidDateRange(createEventDto.start_date, createEventDto.end_date);

    const existing = await this.eventModel
      .findOne({
        name: createEventDto.name,
        start_date: new Date(createEventDto.start_date),
      })
      .exec();
    if (existing) {
      throw new ConflictException(
        `An event named "${createEventDto.name}" starting ${createEventDto.start_date} already exists`,
      );
    }

    try {
      return await this.eventModel.create(createEventDto);
    } catch (error) {
      throw this.translateDuplicateKeyError(error, createEventDto.name);
    }
  }

  findAll(): Promise<EventDocument[]> {
    return this.eventModel.find().sort({ start_date: 1 }).exec();
  }

  async findOne(id: string): Promise<EventDocument> {
    const event = await this.eventModel.findById(id).exec();
    if (!event) {
      throw new NotFoundException(`Event ${id} not found`);
    }
    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<EventDocument> {
    const existing = await this.findOne(id);

    // Validate the *effective* date range (existing values merged with whatever the
    // patch actually changes) — a DTO-only check can't see the persisted counterpart
    // when a caller patches just one of start_date/end_date.
    const effectiveStart = updateEventDto.start_date ?? existing.start_date.toISOString();
    const effectiveEnd = updateEventDto.end_date ?? existing.end_date.toISOString();
    this.assertValidDateRange(effectiveStart, effectiveEnd);

    const effectiveName = updateEventDto.name ?? existing.name;
    if (updateEventDto.name || updateEventDto.start_date) {
      const conflict = await this.eventModel
        .findOne({
          _id: { $ne: id },
          name: effectiveName,
          start_date: new Date(effectiveStart),
        })
        .exec();
      if (conflict) {
        throw new ConflictException(
          `An event named "${effectiveName}" starting ${effectiveStart} already exists`,
        );
      }
    }

    let event: EventDocument | null;
    try {
      event = await this.eventModel
        .findByIdAndUpdate(id, updateEventDto, { new: true })
        .exec();
    } catch (error) {
      throw this.translateDuplicateKeyError(error, effectiveName);
    }
    if (!event) {
      throw new NotFoundException(`Event ${id} not found`);
    }
    return event;
  }

  async remove(id: string): Promise<void> {
    const result = await this.eventModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Event ${id} not found`);
    }
  }

  private assertValidDateRange(startDate: string | Date, endDate: string | Date): void {
    if (new Date(endDate) < new Date(startDate)) {
      throw new BadRequestException('end_date must be on or after start_date');
    }
  }

  // Defense in depth: the pre-checks above prevent duplicates under normal load, but two
  // requests can still race between the check and the write. The unique index is the
  // real guarantee; this just turns Mongo's raw E11000 into a clean, client-friendly 409.
  private translateDuplicateKeyError(error: unknown, name: string): Error {
    const isDuplicateKeyError =
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: number }).code === MONGO_DUPLICATE_KEY_ERROR;

    if (isDuplicateKeyError) {
      return new ConflictException(`An event named "${name}" on this date already exists`);
    }
    return error as Error;
  }
}
