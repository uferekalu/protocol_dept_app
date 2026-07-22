import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, Matches } from 'class-validator';
import { ProtocolMemberRole } from '../../../common/enums';
import {
  PASSWORD_REGEX,
  PASSWORD_REQUIREMENTS_MESSAGE,
} from '../../../common/validators/password.constants';

export class CreateProtocolMemberDto {
  @ApiProperty({ example: 'Grace Adeyemi' })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiProperty({ example: '+2348022223333' })
  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @ApiPropertyOptional({ example: 'grace.adeyemi@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/.../grace.jpg' })
  @IsOptional()
  @IsUrl()
  image_url?: string;

  @ApiProperty({ enum: ProtocolMemberRole, example: ProtocolMemberRole.MEMBER })
  @IsEnum(ProtocolMemberRole)
  role: ProtocolMemberRole;

  @ApiProperty({
    format: 'password',
    description: PASSWORD_REQUIREMENTS_MESSAGE,
    example: 'A-strong-p4ssword!',
  })
  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_REQUIREMENTS_MESSAGE })
  password: string;
}
