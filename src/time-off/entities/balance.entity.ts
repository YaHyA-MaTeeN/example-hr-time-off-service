import { Entity, Column, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('balances')
@Unique(['employeeId', 'locationId']) // Ensures an employee only has one balance per location
export class Balance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  employeeId: string;

  @Column()
  locationId: string;

  @Column({ type: 'float', default: 0 })
  balanceDays: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  lastUpdatedAt: Date;
}