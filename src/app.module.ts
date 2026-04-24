import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TimeOffModule } from './time-off/time-off.module';
import { Balance } from './time-off/entities/balance.entity';
import { LeaveRequest } from './time-off/entities/leave-request.entity';
import { MockHcmModule } from './mock-hcm/mock-hcm.module';

@Module({
  imports: [
    // This configures SQLite and auto-creates the tables for us
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'examplehr.sqlite', 
      entities: [Balance, LeaveRequest],
      synchronize: true, // Auto-creates the schema (perfect for this assessment)
    }),
    TimeOffModule,
    MockHcmModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}