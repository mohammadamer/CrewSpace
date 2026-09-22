import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  ConveneContributionType,
  ConveneParticipantRole,
} from '@crewspace/database';

export class CreateConveneDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  topic!: string;

  @IsOptional()
  @IsUUID('4')
  projectId?: string;
}

export class AddConveneParticipantDto {
  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @IsOptional()
  @IsUUID('4')
  agentId?: string;

  @IsOptional()
  @IsEnum(ConveneParticipantRole)
  role?: ConveneParticipantRole;
}

export class CreateConveneContributionDto {
  @IsEnum(ConveneContributionType)
  type: ConveneContributionType = ConveneContributionType.DISCUSSION;

  @IsString()
  @MinLength(1)
  content!: string;
}

export class CompleteConveneActionItemDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID('4')
  assigneeUserId?: string;

  @IsOptional()
  @IsUUID('4')
  assigneeAgentId?: string;
}

export class CompleteConveneDto {
  @IsString()
  @MinLength(1)
  conclusion!: string;

  @IsArray()
  @IsString({ each: true })
  alternatives: string[] = [];

  @IsOptional()
  @IsString()
  provenance?: string;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  actionItems: CompleteConveneActionItemDto[] = [];
}
