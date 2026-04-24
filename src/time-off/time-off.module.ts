import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { TimeOffService } from './time-off.service';
import { TimeOffController } from './time-off.controller';
import { Balance } from './entities/balance.entity';
import { LeaveRequest } from './entities/leave-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Balance, LeaveRequest]),
    HttpModule // <-- Added this so our service can make network calls
  ],
  controllers: [TimeOffController],
  providers: [TimeOffService],
})
export class TimeOffModule {}