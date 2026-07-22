import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ProtocolMembersService } from '../protocol-members/protocol-members.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { ProtocolMemberRole } from '../../common/enums';

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
  // spec") — always MEMBER, never accepts a role from the caller. Reuses
  // ProtocolMembersService.create() for hashing + duplicate-phone handling rather than
  // duplicating that logic here. Returns the same shape as login() so the frontend can
  // land the new member straight into a logged-in session.
  async signup(signupDto: SignupDto): Promise<LoginResult> {
    const member = await this.protocolMembersService.create({
      ...signupDto,
      role: ProtocolMemberRole.MEMBER,
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
