import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsAfterOrEqual } from '../../../common/validators/is-after-or-equal.decorator';

export class CreateEventDto {
  @ApiProperty({ example: '2026 Easter Revival' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '2026-04-10' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ example: '2026-04-13' })
  @IsDateString()
  @IsAfterOrEqual('start_date', { message: 'end_date must be on or after start_date' })
  end_date: string;

  @ApiProperty({ example: 'National Ecumenical Centre, Abuja' })
  @IsString()
  @IsNotEmpty()
  venue: string;

  @ApiPropertyOptional({ example: 'Annual Easter revival crusade' })
  @IsOptional()
  @IsString()
  description?: string;
}
