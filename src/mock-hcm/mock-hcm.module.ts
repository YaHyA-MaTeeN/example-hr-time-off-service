import { Module } from '@nestjs/common';
import { MockHcmController } from './mock-hcm.controller';

@Module({
  controllers: [MockHcmController]
})
export class MockHcmModule {}
