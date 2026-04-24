import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { TimeOffService } from './time-off.service';
import { CreateTimeOffDto } from './dto/create-time-off.dto';
import { BatchSyncDto } from './dto/batch-sync.dto'; // <-- Added import

@Controller('api/v1')
export class TimeOffController {
  constructor(private readonly timeOffService: TimeOffService) {}

  @Get('balances/:locationId/:employeeId')
  getBalance(
    @Param('locationId') locationId: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.timeOffService.getBalance(employeeId, locationId);
  }

  @Post('requests')
  requestTimeOff(@Body() createTimeOffDto: CreateTimeOffDto) {
    return this.timeOffService.requestTimeOff(createTimeOffDto);
  }

  // <-- New endpoint for the nightly HCM webhook
  @Post('hcm-sync/batch')
  syncBatch(@Body() batchSyncDto: BatchSyncDto) {
    return this.timeOffService.syncBatch(batchSyncDto);
  }
}