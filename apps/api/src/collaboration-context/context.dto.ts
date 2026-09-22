import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateRelationshipDto {
  @IsUUID('4')
  relatedAgentId!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  summary?: string;

  @IsOptional()
  @IsObject()
  communicationPreferences?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  unresolvedTopics?: string[];
}

export class UpdateRelationshipDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  summary?: string;

  @IsOptional()
  @IsObject()
  communicationPreferences?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  unresolvedTopics?: string[];
}

export class RecordInteractionDto {
  @IsString()
  @MinLength(1)
  summary!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  unresolvedTopics?: string[];
}
