import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('leave_requests')
export class LeaveRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  employeeId: string;

  @Column()
  locationId: string;

  @Column({ type: 'float' })
  requestedDays: number;

  @Column({ default: 'PENDING' }) // PENDING, APPROVED, REJECTED, or FAILED_HCM_SYNC
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}