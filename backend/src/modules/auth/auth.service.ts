import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { ProtocolMembersService } from '../protocol-members/protocol-members.service';
import { TermiiService } from '../../common/termii/termii.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { ProtocolMemberRole } from '../../common/enums';

const BCRYPT_SALT_ROUNDS = 10;
const OTP_EXPIRY_MINUTES = 10;

// Safe, public shape of a protocol member — explicitly hand-picked fields rather than
// returning the Mongoose document directly, so this stays correct even if the schema's
// own password_hash-stripping toJSON transform (see protocol-member.schema.ts) is ever
// changed independently of this file.
export interface AuthenticatedProtocolMember {
  _id: string;
  full_name: string;
  phone_number: string;
  role: ProtocolMemberRole;
}

export interface LoginResult {
  access_token: string;
  protocol_member: AuthenticatedProtocolMember;
}

@Injectable()
export class AuthService {
  constructor(
    private protocolMembersService: ProtocolMembersService,
    private jwtService: JwtService,
    private termiiService: TermiiService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResult> {
    const member = await this.protocolMembersService.findByPhoneNumberWithPassword(
      loginDto.phone_number,
    );
    // Same generic message whether the phone number doesn't exist or the password is
    // wrong — doesn't tell an attacker which one they got right.
    if (!member) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    const passwordMatches = await bcrypt.compare(loginDto.password, member.password_hash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    const payload: JwtPayload = { sub: member._id.toString(), role: member.role };
    return {
      access_token: this.jwtService.sign(payload),
      protocol_member: this.toSafeMember(member),
    };
  }

  // Self-service account creation (brief Section 4G, "revised from the original
  // spec") — never accepts a role from the caller. The very first account ever
  // created becomes ADMIN (the app's only in-product bootstrap path — see
  // backend/CLAUDE.md); every one after that becomes MEMBER, promotable later only by
  // an existing ADMIN. Reuses ProtocolMembersService.create() for hashing +
  // duplicate-phone handling rather than duplicating that logic here. Returns the same
  // shape as login() so the frontend can land the new member straight into a
  // logged-in session.
  async signup(signupDto: SignupDto): Promise<LoginResult> {
    const isFirstAccount = (await this.protocolMembersService.count()) === 0;
    const member = await this.protocolMembersService.create({
      ...signupDto,
      role: isFirstAccount ? ProtocolMemberRole.ADMIN : ProtocolMemberRole.MEMBER,
    });

    const payload: JwtPayload = { sub: member._id.toString(), role: member.role };
    return {
      access_token: this.jwtService.sign(payload),
      protocol_member: this.toSafeMember(member),
    };
  }

  async getCurrentUser(protocolMemberId: string): Promise<AuthenticatedProtocolMember> {
    const member = await this.protocolMembersService.findOne(protocolMemberId);
    return this.toSafeMember(member);
  }

  // No current-password field — see ChangePasswordDto's comment. Guards against the
  // one thing that IS enforced: the new password can't be the same as the one already
  // in place.
  async changePassword(
    protocolMemberId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const member = await this.protocolMembersService.findByIdWithPassword(protocolMemberId);
    if (!member) {
      throw new UnauthorizedException();
    }

    const isSameAsCurrent = await bcrypt.compare(
      changePasswordDto.new_password,
      member.password_hash,
    );
    if (isSameAsCurrent) {
      throw new BadRequestException('New password must be different from your current password');
    }

    const password_hash = await bcrypt.hash(changePasswordDto.new_password, BCRYPT_SALT_ROUNDS);
    await this.protocolMembersService.updatePassword(protocolMemberId, password_hash);
  }

  // Always resolves the same way regardless of whether the phone number has an
  // account — same "don't reveal which part was wrong" principle as login()'s generic
  // message — so this can never be used to enumerate registered phone numbers. If an
  // account does exist, generates a 6-digit OTP, hashes it (never stored raw), and
  // texts the plain code via TermiiService (itself best-effort — see its own comment).
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const member = await this.protocolMembersService.findByPhoneNumber(
      forgotPasswordDto.phone_number,
    );
    if (!member) {
      return;
    }

    const otp = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const otp_hash = await bcrypt.hash(otp, BCRYPT_SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await this.protocolMembersService.setResetOtp(member._id.toString(), otp_hash, expiresAt);

    await this.termiiService.sendSms(
      member.phone_number,
      `Your Protocol Department password reset code is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes. If you didn't request this, ignore this message.`,
    );
  }

  // Deliberately one generic error for every failure mode (no account, no OTP on
  // record, expired, wrong code) — same reasoning as login()'s generic message, so a
  // caller can't distinguish "wrong code" from "no such account" by the error shape.
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const member = await this.protocolMembersService.findByPhoneNumberWithResetOtp(
      resetPasswordDto.phone_number,
    );

    const invalidOtp = () => new BadRequestException('Invalid or expired code');

    if (!member?.reset_otp_hash || !member.reset_otp_expires_at) {
      throw invalidOtp();
    }
    if (member.reset_otp_expires_at.getTime() < Date.now()) {
      throw invalidOtp();
    }

    const otpMatches = await bcrypt.compare(resetPasswordDto.otp, member.reset_otp_hash);
    if (!otpMatches) {
      throw invalidOtp();
    }

    const password_hash = await bcrypt.hash(resetPasswordDto.new_password, BCRYPT_SALT_ROUNDS);
    await this.protocolMembersService.updatePassword(member._id.toString(), password_hash);
    await this.protocolMembersService.clearResetOtp(member._id.toString());
  }

  private toSafeMember(member: {
    _id: unknown;
    full_name: string;
    phone_number: string;
    role: ProtocolMemberRole;
  }): AuthenticatedProtocolMember {
    return {
      _id: String(member._id),
      full_name: member.full_name,
      phone_number: member.phone_number,
      role: member.role,
    };
  }
}
