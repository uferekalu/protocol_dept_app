import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MinistersService } from './ministers.service';
import { Minister } from './schemas/minister.schema';

const mockMinister = {
  _id: 'minister-1',
  full_name: 'John Adebayo',
  title: 'Rev.',
  phone_number: '+2348012345678',
  home_church_or_parish: "St. Andrew's Presbyterian Church",
};

// Mongoose query chains (e.g. find().sort().exec()) are mocked as plain objects
// whose methods return `this` until `.exec()` resolves the value.
function makeQuery(result: unknown) {
  return {
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  };
}

describe('MinistersService', () => {
  let service: MinistersService;
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
      providers: [
        MinistersService,
        { provide: getModelToken(Minister.name), useValue: model },
      ],
    }).compile();

    service = module.get<MinistersService>(MinistersService);
  });

  describe('create', () => {
    it('creates a minister when the phone number is not already taken', async () => {
      model.create.mockResolvedValue(mockMinister);

      const result = await service.create(mockMinister as any);

      expect(model.findOne).toHaveBeenCalledWith({
        phone_number: mockMinister.phone_number,
      });
      expect(model.create).toHaveBeenCalledWith(mockMinister);
      expect(result).toEqual(mockMinister);
    });

    it('rejects with ConflictException when the phone number is already in use', async () => {
      model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockMinister) });

      await expect(service.create(mockMinister as any)).rejects.toThrow(
        ConflictException,
      );
      expect(model.create).not.toHaveBeenCalled();
    });

    it('translates a race-condition duplicate-key error into ConflictException', async () => {
      model.create.mockRejectedValue({ code: 11000 });

      await expect(service.create(mockMinister as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  it('lists all ministers sorted by name', async () => {
    model.find.mockReturnValue(makeQuery([mockMinister]));

    const result = await service.findAll();

    expect(model.find).toHaveBeenCalled();
    expect(result).toEqual([mockMinister]);
  });

  it('returns a minister by id', async () => {
    model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockMinister) });

    const result = await service.findOne('minister-1');

    expect(model.findById).toHaveBeenCalledWith('minister-1');
    expect(result).toEqual(mockMinister);
  });

  it('throws NotFoundException when the minister does not exist', async () => {
    model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  describe('update', () => {
    it('throws NotFoundException when updating a missing minister', async () => {
      model.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.update('missing', {})).rejects.toThrow(NotFoundException);
    });

    it('rejects with ConflictException when the new phone number belongs to another minister', async () => {
      model.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockMinister, _id: 'minister-2' }),
      });

      await expect(
        service.update('minister-1', { phone_number: '+2348012345678' }),
      ).rejects.toThrow(ConflictException);
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('excludes the minister being updated from its own duplicate check', async () => {
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMinister),
      });

      await service.update('minister-1', { phone_number: mockMinister.phone_number });

      expect(model.findOne).toHaveBeenCalledWith({
        phone_number: mockMinister.phone_number,
        _id: { $ne: 'minister-1' },
      });
    });

    it('translates a race-condition duplicate-key error into ConflictException', async () => {
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue({ code: 11000 }),
      });

      await expect(
        service.update('minister-1', { phone_number: mockMinister.phone_number }),
      ).rejects.toThrow(ConflictException);
    });
  });

  it('throws NotFoundException when deleting a missing minister', async () => {
    model.findByIdAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
  });
});
