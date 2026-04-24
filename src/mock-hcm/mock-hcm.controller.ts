import { Controller, Post, Body, HttpCode } from '@nestjs/common';

@Controller('external-hcm-api')
export class MockHcmController {
  
  // Simulates the real-time API that ExampleHR calls to verify a leave request [cite: 16]
  @Post('verify-time-off')
  @HttpCode(200)
  verifyTimeOff(@Body() payload: { employeeId: string; locationId: string; requestedDays: number }) {
    
    // Simulating basic HCM logic. If they request more than 20 days, reject it. 
    if (payload.requestedDays > 20) {
      return {
        success: false,
        message: 'HCM Error: Requested days exceed maximum allowed per single request.',
      };
    }

    // Otherwise, the HCM approves it [cite: 19]
    return {
      success: true,
      message: 'HCM Approved: Balance deducted in Source of Truth.',
    };
  }
}