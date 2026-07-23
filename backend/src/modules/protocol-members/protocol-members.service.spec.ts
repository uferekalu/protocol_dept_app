import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { ProtocolMembersService } from './protocol-members.service';
import { ProtocolMember } from './schemas/protocol-member.schema';
import { ProtocolMemberRole } from '../../common/enums';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

const mockMember = {
  _id: 'member-1',
  full_name: 'Grace Adeyemi',
  phone_number: '+2348022223333',
  role: ProtocolMemberRole.MEMBER,
};

function makeQuery(result: unknown) {
  return {
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  };
}

describe('ProtocolMembersService', () => {
  let service: ProtocolMembersService;
  let model: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findByIdAndDelete: jest.Mock;
    countDocuments: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    model = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      countDocuments: jest.fn(),
    };
    // No duplicate by default; individual tests override this to simulate a conflict.
    model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProtocolMembersService,
        { provide: getModelToken(ProtocolMember.name), useValue: model },
      ],
    }).compile();

    service = module.get<ProtocolMembersService>(ProtocolMembersService);
  });

  describe('create', () => {
    const dto = {
      full_name: 'Grace Adeyemi',
      phone_number: '+2348022223333',
      role: ProtocolMemberRole.MEMBER,
      password: 'a-strong-password',
    };

    it('hashes the password and never persists the plaintext', async () => {
      model.create.mockResolvedValue(mockMember);

      await service.create(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('a-strong-password', 10);
      expect(model.create).toHaveBeenCalledWith({
        full_name: 'Grace Adeyemi',
        phone_number: '+2348022223333',
        role: ProtocolMemberRole.MEMBER,
        password_hash: 'hashed-password',
      });
      const createArg = model.create.mock.calls[0][0];
      expect(createArg.password).toBeUndefined();
    });

    it('rejects with ConflictException when the phone number is already in use', async () => {
      model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockMember) });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('translates a race-condition duplicate-key error into ConflictException', async () => {
      model.create.mockRejectedValue({ code: 11000 });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  it('lists all members sorted by name', async () => {
    model.find.mockReturnValue(makeQuery([mockMember]));

    const result = await service.findAll();

    expect(model.find).toHaveBeenCalled();
    expect(result).toEqual([mockMember]);
  });

  it('returns a member by id', async () => {
    model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockMember) });

    const result = await service.findOne('member-1');

    expect(model.findById).toHaveBeenCalledWith('member-1');
    expect(result).toEqual(mockMember);
  });

  it('counts all members (used only for the first-account-is-ADMIN bootstrap check)', async () => {
    model.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(3) });

    const result = await service.count();

    expect(result).toBe(3);
  });

  describe('findByPhoneNumberWithPassword', () => {
    it('opts back into password_hash via select, unlike every other query', async () => {
      const select = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockMember, password_hash: 'hashed' }),
      });
      model.findOne.mockReturnValue({ select });

      const result = await service.findByPhoneNumberWithPassword('+2348022223333');

      expect(model.findOne).toHaveBeenCalledWith({ phone_number: '+2348022223333' });
      expect(select).toHaveBeenCalledWith('+password_hash');
      expect(result).toEqual({ ...mockMember, password_hash: 'hashed' });
    });

    it('returns null when no member matches', async () => {
      model.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      });

      const result = await service.findByPhoneNumberWithPassword('+2340000000000');

      expect(result).toBeNull();
    });
  });

  describe('findByIdWithPassword', () => {
    it('opts back into password_hash via select, scoped to a single id', async () => {
      const select = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockMember, password_hash: 'hashed' }),
      });
      model.findById.mockReturnValue({ select });

      const result = await service.findByIdWithPassword('member-1');

      expect(model.findById).toHaveBeenCalledWith('member-1');
      expect(select).toHaveBeenCalledWith('+password_hash');
      expect(result).toEqual({ ...mockMember, password_hash: 'hashed' });
    });
  });

  it('throws NotFoundException when the member does not exist', async () => {
    model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  describe('update', () => {
    it('throws NotFoundException when updating a missing member', async () => {
      model.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.update('missing', {})).rejects.toThrow(NotFoundException);
    });

    it('passes the update straight through — password is no longer part of this DTO', async () => {
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMember),
      });

      await service.update('member-1', { full_name: 'Grace A.', email: 'grace@example.com' });

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        'member-1',
        { full_name: 'Grace A.', email: 'grace@example.com' },
        { new: true },
      );
    });

    it('rejects with ConflictException when the new phone number belongs to another member', async () => {
      model.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockMember, _id: 'member-2' }),
      });

      await expect(
        service.update('member-1', { phone_number: '+2348022223333' }),
      ).rejects.toThrow(ConflictException);
      expect(model.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('excludes the member being updated from its own duplicate check', async () => {
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMember),
      });

      await service.update('member-1', { phone_number: mockMember.phone_number });

      expect(model.findOne).toHaveBeenCalledWith({
        phone_number: mockMember.phone_number,
        _id: { $ne: 'member-1' },
      });
    });

    it('translates a race-condition duplicate-key error into ConflictException', async () => {
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue({ code: 11000 }),
      });

      await expect(
        service.update('member-1', { phone_number: mockMember.phone_number }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('setPhoto', () => {
    it('writes the given secure_url directly to image_url', async () => {
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockMember, image_url: 'https://res.cloudinary.com/photo.jpg' }),
      });

      await service.setPhoto('member-1', 'https://res.cloudinary.com/photo.jpg');

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        'member-1',
        { image_url: 'https://res.cloudinary.com/photo.jpg' },
        { new: true },
      );
    });

    it('throws NotFoundException when the member does not exist', async () => {
      model.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.setPhoto('missing', 'https://res.cloudinary.com/photo.jpg')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removePhoto', () => {
    it('$unsets image_url rather than setting it to a falsy value', async () => {
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMember),
      });

      await service.removePhoto('member-1');

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        'member-1',
        { $unset: { image_url: 1 } },
        { new: true },
      );
    });

    it('throws NotFoundException when the member does not exist', async () => {
      model.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.removePhoto('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePassword', () => {
    it('writes the given hash directly, the only path allowed to touch password_hash', async () => {
      model.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockMember) });

      await service.updatePassword('member-1', 'new-hashed-password');

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith('member-1', {
        password_hash: 'new-hashed-password',
      });
    });

    it('throws NotFoundException when the member does not exist', async () => {
      model.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.updatePassword('missing', 'new-hashed-password')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  it('throws NotFoundException when deleting a missing member', async () => {
    model.findByIdAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
  });
});
