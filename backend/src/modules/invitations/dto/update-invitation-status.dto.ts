import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { InvitationStatus } from '../../../common/enums';

export class UpdateInvitationStatusDto {
  @ApiProperty({ enum: InvitationStatus, example: InvitationStatus.AIRPORT_PICKUP_IN_PROGRESS })
  @IsEnum(InvitationStatus)
  status: InvitationStatus;

  // Stand-in for the authenticated user until Phase 5 auth exists — once JWT-based auth
  // is built, this should come from the request's authenticated ProtocolMember instead
  // of the request body, per backend/CLAUDE.md.
  @ApiProperty({
    description: 'Protocol member id recording this status change',
    example: '665f1a2b3c4d5e6f7a8b9c0f',
  })
  @IsMongoId()
  updated_by: string;

  @ApiPropertyOptional({ example: 'Flight delayed by 40 minutes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
