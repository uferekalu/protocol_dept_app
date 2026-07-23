import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { AuthService } from './auth.service';
import { ProtocolMembersService } from '../protocol-members/protocol-members.service';
import { TermiiService } from '../../common/termii/termii.service';
import { ProtocolMemberRole } from '../../common/enums';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('new-hashed-password'),
}));

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomInt: jest.fn(),
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
    findByPhoneNumber: jest.Mock;
    findByPhoneNumberWithResetOtp: jest.Mock;
    setResetOtp: jest.Mock;
    clearResetOtp: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    count: jest.Mock;
    updatePassword: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };
  let termiiService: { sendSms: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    protocolMembersService = {
      findByPhoneNumberWithPassword: jest.fn(),
      findByIdWithPassword: jest.fn(),
      findByPhoneNumber: jest.fn(),
      findByPhoneNumberWithResetOtp: jest.fn(),
      setResetOtp: jest.fn(),
      clearResetOtp: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      // Defaults to "not the first account" so the existing signup tests below don't
      // need to know about the bootstrap check unless they're specifically testing it.
      count: jest.fn().mockResolvedValue(1),
      updatePassword: jest.fn(),
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed-jwt') };
    termiiService = { sendSms: jest.fn().mockResolvedValue(undefined) };
    (randomInt as jest.Mock).mockReturnValue(482913);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ProtocolMembersService, useValue: protocolMembersService },
        { provide: JwtService, useValue: jwtService },
        { provide: TermiiService, useValue: termiiService },
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

  describe('forgotPassword', () => {
    const dto = { phone_number: '+2348022223333' };

    it('generates, hashes, and stores an OTP, then texts the plain code', async () => {
      protocolMembersService.findByPhoneNumber.mockResolvedValue(mockMemberWithPassword);

      await service.forgotPassword(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('482913', 10);
      expect(protocolMembersService.setResetOtp).toHaveBeenCalledWith(
        'member-1',
        'new-hashed-password',
        expect.any(Date),
      );
      expect(termiiService.sendSms).toHaveBeenCalledWith(
        '+2348022223333',
        expect.stringContaining('482913'),
      );
    });

    it('does nothing when the phone number has no account, without revealing that', async () => {
      protocolMembersService.findByPhoneNumber.mockResolvedValue(null);

      await expect(service.forgotPassword(dto)).resolves.toBeUndefined();
      expect(protocolMembersService.setResetOtp).not.toHaveBeenCalled();
      expect(termiiService.sendSms).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const dto = { phone_number: '+2348022223333', otp: '482913', new_password: 'A-new-p4ssword!' };
    const memberWithOtp = {
      ...mockMemberWithPassword,
      reset_otp_hash: 'hashed-otp',
      reset_otp_expires_at: new Date(Date.now() + 5 * 60 * 1000),
    };

    it('resets the password and clears the OTP when the code matches and has not expired', async () => {
      protocolMembersService.findByPhoneNumberWithResetOtp.mockResolvedValue(memberWithOtp);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.resetPassword(dto);

      expect(bcrypt.compare).toHaveBeenCalledWith('482913', 'hashed-otp');
      expect(protocolMembersService.updatePassword).toHaveBeenCalledWith(
        'member-1',
        'new-hashed-password',
      );
      expect(protocolMembersService.clearResetOtp).toHaveBeenCalledWith('member-1');
    });

    it('rejects with BadRequestException when no account matches the phone number', async () => {
      protocolMembersService.findByPhoneNumberWithResetOtp.mockResolvedValue(null);

      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
      expect(protocolMembersService.updatePassword).not.toHaveBeenCalled();
    });

    it('rejects with BadRequestException when there is no OTP on record', async () => {
      protocolMembersService.findByPhoneNumberWithResetOtp.mockResolvedValue(
        mockMemberWithPassword,
      );

      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
    });

    it('rejects with BadRequestException when the OTP has expired', async () => {
      protocolMembersService.findByPhoneNumberWithResetOtp.mockResolvedValue({
        ...memberWithOtp,
        reset_otp_expires_at: new Date(Date.now() - 1000),
      });

      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('rejects with BadRequestException when the code does not match', async () => {
      protocolMembersService.findByPhoneNumberWithResetOtp.mockResolvedValue(memberWithOtp);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
      expect(protocolMembersService.updatePassword).not.toHaveBeenCalled();
    });

    it('raises the same error for every failure mode (no account, no OTP, expired, wrong code)', async () => {
      const messages: string[] = [];

      protocolMembersService.findByPhoneNumberWithResetOtp.mockResolvedValue(null);
      try {
        await service.resetPassword(dto);
      } catch (error) {
        messages.push((error as BadRequestException).message);
      }

      protocolMembersService.findByPhoneNumberWithResetOtp.mockResolvedValue(
        mockMemberWithPassword,
      );
      try {
        await service.resetPassword(dto);
      } catch (error) {
        messages.push((error as BadRequestException).message);
      }

      protocolMembersService.findByPhoneNumberWithResetOtp.mockResolvedValue({
        ...memberWithOtp,
        reset_otp_expires_at: new Date(Date.now() - 1000),
      });
      try {
        await service.resetPassword(dto);
      } catch (error) {
        messages.push((error as BadRequestException).message);
      }

      protocolMembersService.findByPhoneNumberWithResetOtp.mockResolvedValue(memberWithOtp);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      try {
        await service.resetPassword(dto);
      } catch (error) {
        messages.push((error as BadRequestException).message);
      }

      expect(new Set(messages).size).toBe(1);
      expect(messages).toHaveLength(4);
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
