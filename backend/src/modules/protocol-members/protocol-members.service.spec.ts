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

  it('throws NotFoundException when the member does not exist', async () => {
    model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  describe('update', () => {
    it('throws NotFoundException when updating a missing member', async () => {
      model.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.update('missing', {})).rejects.toThrow(NotFoundException);
    });

    it('hashes a new password and never sends the plaintext to the model', async () => {
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMember),
      });

      await service.update('member-1', { password: 'a-new-password' });

      expect(bcrypt.hash).toHaveBeenCalledWith('a-new-password', 10);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        'member-1',
        { password_hash: 'hashed-password' },
        { new: true },
      );
    });

    it('leaves password_hash untouched when password is not part of the update', async () => {
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMember),
      });

      await service.update('member-1', { full_name: 'Grace A.' });

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        'member-1',
        { full_name: 'Grace A.' },
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

  it('throws NotFoundException when deleting a missing member', async () => {
    model.findByIdAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
  });
});
