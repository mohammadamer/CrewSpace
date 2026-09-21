import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { AgentStatus } from '@crewspace/database';

export class CreatePersonaDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  role!: string;

  @IsString()
  personality!: string;

  @IsString()
  expertise!: string;

  @IsArray()
  @IsString({ each: true })
  responsibilities: string[] = [];

  @IsString()
  communicationStyle!: string;

  @IsArray()
  @IsString({ each: true })
  behavioralRules: string[] = [];

  @IsArray()
  @IsString({ each: true })
  goals: string[] = [];

  @IsArray()
  @IsString({ each: true })
  constraints: string[] = [];

  @IsString()
  systemPrompt!: string;
}

export class CreateAgentDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  role!: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  personaId?: string;

  @IsObject()
  modelConfiguration: Record<string, unknown> = {};

  @IsArray()
  @IsString({ each: true })
  capabilities: string[] = [];
}

export class UpdateAgentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsEnum(AgentStatus)
  status?: AgentStatus;

  @IsOptional()
  @IsObject()
  modelConfiguration?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  capabilities?: string[];
}
