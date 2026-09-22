import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { ConversationType } from '@crewspace/database';

export class CreateConversationDto {
  @IsEnum(ConversationType)
  type: ConversationType = ConversationType.DIRECT;

  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  userIds: string[] = [];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  agentIds: string[] = [];
}

export class CreateMessageDto {
  @IsString()
  @MinLength(1)
  content!: string;
}

export class ListMessagesQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}
