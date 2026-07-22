import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { ProtocolMembersService } from '../protocol-members/protocol-members.service';
import { ProtocolMemberRole } from '../../common/enums';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('new-hashed-password'),
}));

const mockMemberWithPassword = {
  _id: 'member-1',
  full_name: 'Grace Adeyemi',
  phone_number: '+2348022223333',
  role: ProtocolMemberRole.MEMBER,
  password_hash: 'hashed-password',
};

describe('AuthService', () => {
  let service: AuthService;
  let protocolMembersService: {
    findByPhoneNumberWithPassword: jest.Mock;
    findByIdWithPassword: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    count: jest.Mock;
    updatePassword: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    protocolMembersService = {
      findByPhoneNumberWithPassword: jest.fn(),
      findByIdWithPassword: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      // Defaults to "not the first account" so the existing signup tests below don't
      // need to know about the bootstrap check unless they're specifically testing it.
      count: jest.fn().mockResolvedValue(1),
      updatePassword: jest.fn(),
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed-jwt') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ProtocolMembersService, useValue: protocolMembersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    const dto = { phone_number: '+2348022223333', password: 'a-strong-password' };

    it('returns a signed JWT and the safe member shape on success', async () => {
      protocolMembersService.findByPhoneNumberWithPassword.mockResolvedValue(
        mockMemberWithPassword,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(dto);

      expect(bcrypt.compare).toHaveBeenCalledWith('a-strong-password', 'hashed-password');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'member-1',
        role: ProtocolMemberRole.MEMBER,
      });
      expect(result).toEqual({
        access_token: 'signed-jwt',
        protocol_member: {
          _id: 'member-1',
          full_name: 'Grace Adeyemi',
          phone_number: '+2348022223333',
          role: ProtocolMemberRole.MEMBER,
        },
      });
      // password_hash must never leak into the response.
      expect(result.protocol_member).not.toHaveProperty('password_hash');
    });

    it('rejects with UnauthorizedException when the phone number is unknown', async () => {
      protocolMembersService.findByPhoneNumberWithPassword.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('rejects with UnauthorizedException when the password is wrong', async () => {
      protocolMembersService.findByPhoneNumberWithPassword.mockResolvedValue(
        mockMemberWithPassword,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('raises the same error for an unknown phone number and a wrong password', async () => {
      protocolMembersService.findByPhoneNumberWithPassword.mockResolvedValue(null);
      let unknownPhoneMessage = '';
      try {
        await service.login(dto);
      } catch (error) {
        unknownPhoneMessage = (error as UnauthorizedException).message;
      }

      protocolMembersService.findByPhoneNumberWithPassword.mockResolvedValue(
        mockMemberWithPassword,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      let wrongPasswordMessage = '';
      try {
        await service.login(dto);
      } catch (error) {
        wrongPasswordMessage = (error as UnauthorizedException).message;
      }

      expect(unknownPhoneMessage).toBe(wrongPasswordMessage);
    });
  });

  describe('signup', () => {
    const dto = {
      full_name: 'Grace Adeyemi',
      phone_number: '+2348022223333',
      password: 'a-strong-password',
    };

    it('creates the member with role MEMBER when this is not the first account, ignoring anything else in the payload', async () => {
      protocolMembersService.count.mockResolvedValue(1);
      protocolMembersService.create.mockResolvedValue(mockMemberWithPassword);

      const result = await service.signup(dto);

      expect(protocolMembersService.create).toHaveBeenCalledWith({
        ...dto,
        role: ProtocolMemberRole.MEMBER,
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'member-1',
        role: ProtocolMemberRole.MEMBER,
      });
      expect(result).toEqual({
        access_token: 'signed-jwt',
        protocol_member: {
          _id: 'member-1',
          full_name: 'Grace Adeyemi',
          phone_number: '+2348022223333',
          role: ProtocolMemberRole.MEMBER,
        },
      });
    });

    it('creates the very first account ever as ADMIN (the in-app bootstrap path)', async () => {
      protocolMembersService.count.mockResolvedValue(0);
      protocolMembersService.create.mockResolvedValue({
        ...mockMemberWithPassword,
        role: ProtocolMemberRole.ADMIN,
      });

      const result = await service.signup(dto);

      expect(protocolMembersService.create).toHaveBeenCalledWith({
        ...dto,
        role: ProtocolMemberRole.ADMIN,
      });
      expect(result.protocol_member.role).toBe(ProtocolMemberRole.ADMIN);
    });

    it('propagates a duplicate-phone conflict from ProtocolMembersService.create', async () => {
      const { ConflictException } = jest.requireActual('@nestjs/common');
      protocolMembersService.create.mockRejectedValue(new ConflictException());

      await expect(service.signup(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('changePassword', () => {
    const dto = { new_password: 'A-new-p4ssword!' };

    it('rejects when the new password is the same as the current one', async () => {
      protocolMembersService.findByIdWithPassword.mockResolvedValue(mockMemberWithPassword);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.changePassword('member-1', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(protocolMembersService.updatePassword).not.toHaveBeenCalled();
    });

    it('hashes and saves the new password when it differs from the current one', async () => {
      protocolMembersService.findByIdWithPassword.mockResolvedValue(mockMemberWithPassword);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await service.changePassword('member-1', dto);

      expect(bcrypt.compare).toHaveBeenCalledWith('A-new-p4ssword!', 'hashed-password');
      expect(bcrypt.hash).toHaveBeenCalledWith('A-new-p4ssword!', 10);
      expect(protocolMembersService.updatePassword).toHaveBeenCalledWith(
        'member-1',
        'new-hashed-password',
      );
    });

    it('rejects with UnauthorizedException if the member somehow no longer exists', async () => {
      protocolMembersService.findByIdWithPassword.mockResolvedValue(null);

      await expect(service.changePassword('missing', dto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(protocolMembersService.updatePassword).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('returns the safe member shape for a valid id', async () => {
      protocolMembersService.findOne.mockResolvedValue(mockMemberWithPassword);

      const result = await service.getCurrentUser('member-1');

      expect(result).toEqual({
        _id: 'member-1',
        full_name: 'Grace Adeyemi',
        phone_number: '+2348022223333',
        role: ProtocolMemberRole.MEMBER,
      });
    });
  });
});
