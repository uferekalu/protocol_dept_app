import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { InvitationStatus } from '../../../common/enums';

export class UpdateInvitationStatusDto {
  @ApiProperty({ enum: InvitationStatus, example: InvitationStatus.AIRPORT_PICKUP_IN_PROGRESS })
  @IsEnum(InvitationStatus)
  status: InvitationStatus;

  // No longer trusted — the real value always comes from the authenticated request
  // (JwtPayload.sub via @CurrentUser() in the controller), never the body. Kept here,
  // optional and unused, purely so a not-yet-updated client that still sends this field
  // doesn't get rejected by the global ValidationPipe's forbidNonWhitelisted check;
  // remove once every client has moved off the old contract.
  @ApiPropertyOptional({
    deprecated: true,
    description: 'Ignored — the authenticated user is always used instead.',
  })
  @IsOptional()
  @IsMongoId()
  updated_by?: string;

  @ApiPropertyOptional({ example: 'Flight delayed by 40 minutes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
