import { IsBoolean, IsOptional } from 'class-validator';

export class ScheduleDto {
  @IsOptional()
  @IsBoolean()
  skipWeekends?: boolean;
}
