import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateProfileDto  {
  @IsString()
  @IsNotEmpty()
  authId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  lastname: string;

  @IsNumber()
  @IsNotEmpty()
  age: number;
}
