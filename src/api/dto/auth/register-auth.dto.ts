import { IsEmail, IsNotEmpty, IsString, MinLength, IsNumber } from 'class-validator';

export class RegisterAuthDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  lastname: string;

  @IsNumber()
  @IsNotEmpty()
  age: number;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
