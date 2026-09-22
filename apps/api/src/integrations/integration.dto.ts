import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IntegrationProvider, IntegrationStatus } from '@crewspace/database';

export class CreateIntegrationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsEnum(IntegrationProvider)
  provider!: IntegrationProvider;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateIntegrationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(IntegrationStatus)
  status?: IntegrationStatus;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateCredentialDto {
  @IsEnum(IntegrationProvider)
  provider!: IntegrationProvider;

  @IsString()
  @MinLength(1)
  value!: string;
}
