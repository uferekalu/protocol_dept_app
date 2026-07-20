import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AssignmentStatus } from '../../../common/enums';

export class UpdateAssignmentStatusDto {
  @ApiProperty({ enum: AssignmentStatus, example: AssignmentStatus.COMPLETED })
  @IsEnum(AssignmentStatus)
  status: AssignmentStatus;

  @ApiPropertyOptional({ example: 'Took an alternate route due to traffic' })
  @IsOptional()
  @IsString()
  notes?: string;
}
