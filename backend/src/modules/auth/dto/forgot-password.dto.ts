import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: '+2348022223333' })
  @IsString()
  @IsNotEmpty()
  phone_number: string;
}
