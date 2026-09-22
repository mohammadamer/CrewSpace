import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApprovalRisk } from '@crewspace/database';

export class CreateApprovalRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  capability!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  action!: string;

  @IsEnum(ApprovalRisk)
  risk!: ApprovalRisk;

  @IsObject()
  payload: Record<string, unknown> = {};

  @IsString()
  @MinLength(1)
  reason!: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}

export class UpdateToolPermissionDto {
  @IsUUID('4')
  agentId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  capability!: string;

  @IsBoolean()
  enabled!: boolean;
}
