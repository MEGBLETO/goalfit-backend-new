import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'User first name', example: 'John' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'User last name', example: 'Doe' })
  @IsString()
  surname: string;

  @ApiProperty({ description: 'User email address', example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User password (minimum 6 characters)', example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
