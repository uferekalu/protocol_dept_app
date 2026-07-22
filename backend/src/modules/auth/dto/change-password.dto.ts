import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';
import {
  PASSWORD_REGEX,
  PASSWORD_REQUIREMENTS_MESSAGE,
} from '../../../common/validators/password.constants';

// No `current_password` field, per spec — the only check is that the new password
// differs from the existing one (AuthService.changePassword()), not that the caller
// proves they know the old one. Relies entirely on the JwtAuthGuard-verified session;
// consider adding current-password re-entry for stronger protection against a hijacked
// session later. No `confirm_password` either: matching is a frontend-only concern
// (catches typos before the request is even sent).
export class ChangePasswordDto {
  @ApiProperty({
    format: 'password',
    description: PASSWORD_REQUIREMENTS_MESSAGE,
    example: 'A-new-p4ssword!',
  })
  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_REQUIREMENTS_MESSAGE })
  new_password: string;
}
