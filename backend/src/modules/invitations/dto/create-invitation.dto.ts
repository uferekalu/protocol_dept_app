import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { IsAfterOrEqual } from '../../../common/validators/is-after-or-equal.decorator';

export class CreateInvitationDto {
  @ApiProperty({ description: 'Minister id', example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @IsMongoId()
  minister_id: string;

  @ApiProperty({ description: 'Event id', example: '665f1a2b3c4d5e6f7a8b9c0e' })
  @IsMongoId()
  event_id: string;

  @ApiProperty({ example: '2026-04-09' })
  @IsDateString()
  arrival_date: string;

  @ApiProperty({ example: '2026-04-14' })
  @IsDateString()
  @IsAfterOrEqual('arrival_date', {
    message: 'departure_date must be on or after arrival_date',
  })
  departure_date: string;

  @ApiPropertyOptional({
    description: 'Auto-calculated from arrival/departure dates if omitted; pass a value to override',
    example: 6,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  number_of_days?: number;

  @ApiProperty({ example: 'Transcorp Hilton' })
  @IsString()
  @IsNotEmpty()
  hotel_name: string;

  @ApiProperty({ example: '1 Aguiyi Ironsi St, Maitama, Abuja' })
  @IsString()
  @IsNotEmpty()
  hotel_address: string;

  @ApiPropertyOptional({ example: '204' })
  @IsOptional()
  @IsString()
  hotel_room_number?: string;

  @ApiPropertyOptional({
    description: 'Dates within the stay the minister is scheduled to preach',
    example: ['2026-04-10', '2026-04-12'],
  })
  @IsOptional()
  @IsArray()
  @IsDateString({}, { each: true })
  preaching_dates?: string[];
}
