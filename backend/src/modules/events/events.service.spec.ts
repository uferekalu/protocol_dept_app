import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EventsService } from './events.service';
import { Event } from './schemas/event.schema';

const mockEvent = {
  _id: 'event-1',
  name: '2026 Easter Revival',
  start_date: new Date('2026-04-10'),
  end_date: new Date('2026-04-13'),
  venue: 'National Ecumenical Centre, Abuja',
};

function makeQuery(result: unknown) {
  return {
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  };
}

describe('EventsService', () => {
  let service: EventsService;
  let model: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findByIdAndDelete: jest.Mock;
  };

  beforeEach(async () => {
    model = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };
    // No duplicate by default; individual tests override this to simulate a conflict.
    model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    const module: TestingModule = await Test.createTestingModule({
      providers: [EventsService, { provide: getModelToken(Event.name), useValue: model }],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  describe('create', () => {
    const dto = {
      name: '2026 Easter Revival',
      start_date: '2026-04-10',
      end_date: '2026-04-13',
      venue: 'National Ecumenical Centre, Abuja',
    };

    it('creates an event with a valid date range', async () => {
      model.create.mockResolvedValue(mockEvent);

      const result = await service.create(dto);

      expect(model.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockEvent);
    });

    it('rejects when end_date is before start_date', async () => {
      await expect(
        service.create({ ...dto, start_date: '2026-04-13', end_date: '2026-04-10' }),
      ).rejects.toThrow(BadRequestException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('rejects with ConflictException when name + start_date already exist', async () => {
      model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockEvent) });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('translates a race-condition duplicate-key error into ConflictException', async () => {
      model.create.mockRejectedValue({ code: 11000 });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  it('lists all events sorted by start date', async () => {
    model.find.mockReturnValue(makeQuery([mockEvent]));

    const result = await service.findAll();

    expect(model.find).toHaveBeenCalled();
    expect(result).toEqual([mockEvent]);
  });

  it('returns an event by id', async () => {
    model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockEvent) });

    const result = await service.findOne('event-1');

    expect(model.findById).toHaveBeenCalledWith('event-1');
    expect(result).toEqual(mockEvent);
  });

  it('throws NotFoundException when the event does not exist', async () => {
    model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  describe('update', () => {
    beforeEach(() => {
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockEvent) });
    });

    it('throws NotFoundException when updating a missing event', async () => {
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.update('missing', {})).rejects.toThrow(NotFoundException);
    });

    it('rejects when patching start_date past the existing end_date', async () => {
      await expect(
        service.update('event-1', { start_date: '2026-04-20' }),
      ).rejects.toThrow(BadRequestException);
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('rejects when patching end_date before the existing start_date', async () => {
      await expect(
        service.update('event-1', { end_date: '2026-04-01' }),
      ).rejects.toThrow(BadRequestException);
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('rejects with ConflictException when the effective name + start_date collide with another event', async () => {
      model.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockEvent, _id: 'event-2' }),
      });

      await expect(
        service.update('event-1', { name: 'Duplicate Name' }),
      ).rejects.toThrow(ConflictException);
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('excludes the event being updated from its own duplicate check', async () => {
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockEvent),
      });

      await service.update('event-1', { name: '2026 Easter Revival (Updated)' });

      expect(model.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: { $ne: 'event-1' } }),
      );
    });

    it('does not re-check for duplicates when neither name nor start_date changes', async () => {
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockEvent),
      });

      await service.update('event-1', { venue: 'New Venue' });

      expect(model.findOne).not.toHaveBeenCalled();
    });

    it('translates a race-condition duplicate-key error into ConflictException', async () => {
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue({ code: 11000 }),
      });

      await expect(
        service.update('event-1', { name: 'Something Else' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  it('throws NotFoundException when deleting a missing event', async () => {
    model.findByIdAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
  });
});
