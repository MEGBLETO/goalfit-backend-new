import {
  IsEmail,
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsObject,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ description: 'User first name', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ description: 'User last name', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ description: 'User name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'User surname', required: false })
  @IsOptional()
  @IsString()
  surname?: string;

  @ApiProperty({ description: 'User email address', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'User phone number', required: false })
  @IsOptional()
  @IsString()
  contact?: string;

  @ApiProperty({ description: 'User avatar URL', required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  // Profile-related fields
  @ApiProperty({
    description: 'User gender',
    required: false,
    enum: ['homme', 'femme'],
  })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({
    description: 'User date of birth (ISO string)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({
    description: 'User fitness level',
    required: false,
    enum: ['débutant', 'intermédiaire', 'avancé'],
  })
  @IsOptional()
  @IsString()
  fitnessLevel?: string;

  @ApiProperty({ description: 'User weight in kg', required: false })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiProperty({ description: 'User objective weight in kg', required: false })
  @IsOptional()
  @IsNumber()
  objectiveWeight?: number;

  @ApiProperty({
    description: 'User age (computed from date of birth)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  age?: number;

  @ApiProperty({ description: 'User height in cm', required: false })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiProperty({ description: 'User fitness goal', required: false })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiProperty({
    description: 'User dietary preferences/restrictions',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  dietaryPreferences?: string[];

  @ApiProperty({
    description: 'Available equipment',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  equipment?: string[];

  @ApiProperty({
    description: 'User availability for workouts',
    required: false,
    type: 'object',
    properties: {
      daysPerWeek: {
        type: 'number',
        description: 'Number of days per week available for workouts',
      },
      minutesPerDay: {
        type: 'number',
        description: 'Number of minutes per day available for workouts',
      },
    },
  })
  @IsOptional()
  @IsObject()
  availability?: {
    daysPerWeek: number;
    minutesPerDay: number;
  };

  @ApiProperty({
    description: 'Health considerations',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  healthConsiderations?: string[];
}
