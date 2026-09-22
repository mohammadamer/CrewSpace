import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class ExecuteAgentDto {
  @IsString()
  @MinLength(1)
  prompt!: string;

  @IsOptional()
  @IsObject()
  modelConfiguration?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  maxAttempts = 3;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120_000)
  timeoutMs = 30_000;
}
