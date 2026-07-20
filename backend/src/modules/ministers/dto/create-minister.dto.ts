import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMinisterDto {
  @ApiProperty({ example: 'John Adebayo' })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiProperty({ example: 'Rev. Dr.' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @ApiPropertyOptional({ example: 'john.adebayo@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'St. Andrew\'s Presbyterian Church, Lagos' })
  @IsString()
  @IsNotEmpty()
  home_church_or_parish: string;

  @ApiPropertyOptional({ description: 'URL to a stored photo' })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiPropertyOptional({ example: 'Vegetarian diet; requests ground-floor room' })
  @IsOptional()
  @IsString()
  notes?: string;
}
