import { IsString, IsNumber, Min } from 'class-validator';

export class CreateTimeOffDto {
  @IsString()
  employeeId: string;

  @IsString()
  locationId: string;

  @IsNumber()
  @Min(0.5, { message: 'Must request at least half a day off' })
  requestedDays: number;
}