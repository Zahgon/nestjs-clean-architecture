import { IsOptional, IsString, IsNumber, Min, Max, MinLength, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Name must be at most 50 characters long' })
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name must be at most 50 characters long' })
  lastname?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Age must be a number' })
  @Min(0, { message: 'Age must be at least 0' })
  @Max(150, { message: 'Age must be at most 150' })
  age?: number;
}
