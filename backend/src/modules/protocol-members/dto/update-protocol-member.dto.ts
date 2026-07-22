import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProtocolMemberDto } from './create-protocol-member.dto';

// `password` is deliberately excluded — changing a password now goes through the
// dedicated PATCH /auth/change-password (see AuthService.changePassword()), not the
// general profile update, so this endpoint can never be used to set a password without
// the "must differ from your current one" check that flow enforces.
export class UpdateProtocolMemberDto extends PartialType(
  OmitType(CreateProtocolMemberDto, ['password'] as const),
) {}
