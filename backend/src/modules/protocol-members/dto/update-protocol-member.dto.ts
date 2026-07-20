import { PartialType } from '@nestjs/swagger';
import { CreateProtocolMemberDto } from './create-protocol-member.dto';

export class UpdateProtocolMemberDto extends PartialType(CreateProtocolMemberDto) {}
