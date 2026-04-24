import { IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SyncBalanceItem {
  @IsString()
  employeeId: string;

  @IsString()
  locationId: string;

  @IsNumber()
  balanceDays: number;
}

export class BatchSyncDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncBalanceItem)
  balances: SyncBalanceItem[];
}