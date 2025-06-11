import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

class AvailabilityDto {
  @IsInt()
  @Min(1)
  @Max(7)
  daysPerWeek: number;

  @IsInt()
  @Min(5)
  minutesPerDay: number;
}

export class GeneratePlanDto {
  @IsString()
  gender: string;

  @IsInt()
  age: number;

  @IsNumber()
  weight: number;

  @IsNumber()
  height: number;

  @IsString()
  fitnessLevel: string;

  @IsString()
  goal: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryPreferences?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  healthConsiderations?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipment?: string[];

  @ValidateNested()
  @Type(() => AvailabilityDto)
  availability: AvailabilityDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dates?: string[];
}
