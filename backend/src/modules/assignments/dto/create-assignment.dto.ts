import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { AssignmentType } from '../../../common/enums';

export class CreateAssignmentDto {
  @ApiProperty({ description: 'Invitation id', example: '665f1a2b3c4d5e6f7a8b9c10' })
  @IsMongoId()
  invitation_id: string;

  @ApiProperty({ description: 'Protocol member id', example: '665f1a2b3c4d5e6f7a8b9c0f' })
  @IsMongoId()
  protocol_member_id: string;

  @ApiProperty({ enum: AssignmentType, example: AssignmentType.AIRPORT_PICKUP })
  @IsEnum(AssignmentType)
  assignment_type: AssignmentType;

  @ApiProperty({ example: '2026-04-09T14:00:00.000Z' })
  @IsDateString()
  scheduled_time: string;

  @ApiPropertyOptional({ example: 'Flight arrives at Terminal 2' })
  @IsOptional()
  @IsString()
  notes?: string;
}
