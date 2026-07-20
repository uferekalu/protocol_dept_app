import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ProtocolMemberRole } from '../../../common/enums';

export class CreateProtocolMemberDto {
  @ApiProperty({ example: 'Grace Adeyemi' })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiProperty({ example: '+2348022223333' })
  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @ApiProperty({ enum: ProtocolMemberRole, example: ProtocolMemberRole.MEMBER })
  @IsEnum(ProtocolMemberRole)
  role: ProtocolMemberRole;

  @ApiProperty({
    format: 'password',
    minLength: 8,
    description: 'Plaintext password; hashed before storage and never returned by the API.',
    example: 'a-strong-password',
  })
  @IsString()
  @MinLength(8)
  password: string;
}
