import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateScheduleDto {
  @IsInt()
  @Min(1)
  @Max(1_440)
  cadenceMinutes!: number;

  @IsString()
  @Min(1)
  timezone!: string;

  @Matches(timePattern)
  activeHoursStart!: string;

  @Matches(timePattern)
  activeHoursEnd!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_440)
  cooldownMinutes = 0;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  dailyBudget = 1;
}

export class UpdateScheduleDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_440)
  cadenceMinutes?: number;

  @IsOptional()
  @IsString()
  @Min(1)
  timezone?: string;

  @IsOptional()
  @Matches(timePattern)
  activeHoursStart?: string;

  @IsOptional()
  @Matches(timePattern)
  activeHoursEnd?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_440)
  cooldownMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  dailyBudget?: number;
}

export class WakeScheduleDto {
  @IsOptional()
  @IsUUID('4')
  requestedByExecutionId?: string;
}
