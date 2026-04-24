import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Balance } from './entities/balance.entity';
import { LeaveRequest } from './entities/leave-request.entity';
import { CreateTimeOffDto } from './dto/create-time-off.dto';
import { BatchSyncDto } from './dto/batch-sync.dto';

@Injectable()
export class TimeOffService {
  constructor(
    @InjectRepository(Balance)
    private balanceRepo: Repository<Balance>,
    private dataSource: DataSource,
    private readonly httpService: HttpService, // <-- Injected the HTTP tool
  ) {}

  async getBalance(employeeId: string, locationId: string): Promise<Balance> {
    let balance = await this.balanceRepo.findOne({ where: { employeeId, locationId } });
    
    if (!balance) {
      balance = this.balanceRepo.create({ employeeId, locationId, balanceDays: 10 });
      await this.balanceRepo.save(balance);
    }
    return balance;
  }

  async requestTimeOff(dto: CreateTimeOffDto): Promise<LeaveRequest> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const balance = await queryRunner.manager.findOne(Balance, {
        where: { employeeId: dto.employeeId, locationId: dto.locationId },
      });

      if (!balance || balance.balanceDays < dto.requestedDays) {
        throw new BadRequestException('Insufficient time-off balance.');
      }

      // We now call the real mock function!
      const hcmResponse = await this.mockHcmApiCall(dto);
      if (!hcmResponse.success) {
        throw new InternalServerErrorException('HCM System rejected the request.');
      }

      balance.balanceDays -= dto.requestedDays;
      await queryRunner.manager.save(balance);

      const leaveRequest = queryRunner.manager.create(LeaveRequest, {
        employeeId: dto.employeeId,
        locationId: dto.locationId,
        requestedDays: dto.requestedDays,
        status: 'APPROVED',
      });
      await queryRunner.manager.save(leaveRequest);

      await queryRunner.commitTransaction();
      return leaveRequest;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error; 
    } finally {
      await queryRunner.release();
    }
  }

  async syncBatch(dto: BatchSyncDto): Promise<{ updated: number }> {
    let updatedCount = 0;
    for (const item of dto.balances) {
      let balance = await this.balanceRepo.findOne({
        where: { employeeId: item.employeeId, locationId: item.locationId },
      });

      if (balance) {
        balance.balanceDays = item.balanceDays;
      } else {
        balance = this.balanceRepo.create({
          employeeId: item.employeeId,
          locationId: item.locationId,
          balanceDays: item.balanceDays,
        });
      }
      await this.balanceRepo.save(balance);
      updatedCount++;
    }
    return { updated: updatedCount };
  }

  // <-- This now makes an ACTUAL network request to our Mock Server
  private async mockHcmApiCall(dto: CreateTimeOffDto): Promise<{ success: boolean }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post('http://127.0.0.1:3000/external-hcm-api/verify-time-off', {
          employeeId: dto.employeeId,
          locationId: dto.locationId,
          requestedDays: dto.requestedDays,
        })
      );
      return { success: response.data.success };
    } catch (error) {
      return { success: false };
    }
  }
}