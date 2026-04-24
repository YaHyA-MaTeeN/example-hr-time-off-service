import { Test, TestingModule } from '@nestjs/testing';
import { TimeOffService } from './time-off.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Balance } from './entities/balance.entity';
import { DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { of } from 'rxjs';

describe('TimeOffService', () => {
  let service: TimeOffService;
  
  // Mocks to simulate our database and HTTP calls without actually hitting them
  const mockBalanceRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeOffService,
        { provide: getRepositoryToken(Balance), useValue: mockBalanceRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<TimeOffService>(TimeOffService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Defensive Programming: requestTimeOff', () => {
    
    it('should block the request if balance is insufficient', async () => {
      // Arrange: Simulate a user with only 2 days left
      mockQueryRunner.manager.findOne.mockResolvedValue({ balanceDays: 2 });
      
      const dto = { employeeId: 'EMP-1', locationId: 'LOC-1', requestedDays: 5 };

      // Act & Assert: If they ask for 5 days, the system MUST throw a BadRequestException
      await expect(service.requestTimeOff(dto)).rejects.toThrow(BadRequestException);
      await expect(service.requestTimeOff(dto)).rejects.toThrow('Insufficient time-off balance.');
      
      // Prove that the transaction rolls back safely
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should approve and deduct balance if sufficient', async () => {
      // Arrange: Simulate a user with 10 days left and a successful HCM response
      const initialBalance = { balanceDays: 10 };
      mockQueryRunner.manager.findOne.mockResolvedValue(initialBalance);
      mockQueryRunner.manager.create.mockReturnValue({ status: 'APPROVED' });
      mockHttpService.post.mockReturnValue(of({ data: { success: true } }));

      const dto = { employeeId: 'EMP-1', locationId: 'LOC-1', requestedDays: 3 };

      // Act
      const result = await service.requestTimeOff(dto);

      // Assert: The math should deduct exactly 3 days, and commit the transaction
      expect(initialBalance.balanceDays).toBe(7);
      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.status).toBe('APPROVED');
    });

    it('should rollback the entire transaction if the external HCM rejects it', async () => {
      // Arrange: User has enough days, but the external server says NO
      mockQueryRunner.manager.findOne.mockResolvedValue({ balanceDays: 10 });
      
      // Simulate the mock HCM returning success: false
      mockHttpService.post.mockReturnValue(of({ data: { success: false } }));

      const dto = { employeeId: 'EMP-1', locationId: 'LOC-1', requestedDays: 5 };

      // Act & Assert: It MUST throw an InternalServerError and rollback
      await expect(service.requestTimeOff(dto)).rejects.toThrow(InternalServerErrorException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      
      // Prove that it never reached the 'save' step to deduct the days locally
      expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
    });

    it('should strictly isolate concurrent requests (same time, different tabs)', async () => {
      // Arrange: Reset mock counters so we get a clean slate
      jest.clearAllMocks();
      
      mockQueryRunner.manager.findOne.mockResolvedValue({ balanceDays: 10 });
      mockHttpService.post.mockReturnValue(of({ data: { success: true } }));
      mockQueryRunner.manager.create.mockReturnValue({ status: 'APPROVED' });

      const dto1 = { employeeId: 'EMP-1', locationId: 'LOC-1', requestedDays: 2 };
      const dto2 = { employeeId: 'EMP-1', locationId: 'LOC-1', requestedDays: 3 };

      // Act: Fire both requests at the exact same millisecond using Promise.all
      await Promise.all([
        service.requestTimeOff(dto1),
        service.requestTimeOff(dto2)
      ]);

      // Assert: Even though they hit at the same time, the service must have 
      // explicitly requested two completely separate transaction locks.
      expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(2);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(2);
    });

  });
});