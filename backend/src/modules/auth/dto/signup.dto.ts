import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

// Deliberately has no `role` field — every self-service signup becomes a MEMBER (see
// AuthService.signup()). Mirrors CreateProtocolMemberDto minus role.
export class SignupDto {
  @ApiProperty({ example: 'Grace Adeyemi' })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiProperty({ example: '+2348022223333' })
  @IsString()
  @IsNotEmpty()
  phone_number: string;

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
