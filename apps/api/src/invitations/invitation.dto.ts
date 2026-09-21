import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { WorkspaceRole } from '@crewspace/database';

export class CreateEmailInvitationDto {
  @IsEmail()
  invitedEmail!: string;

  @IsEnum(WorkspaceRole)
  role: WorkspaceRole = WorkspaceRole.MEMBER;

  @IsInt()
  @Min(1)
  @Max(30)
  @IsOptional()
  expiresInDays = 7;
}

export class CreateLinkInvitationDto {
  @IsEnum(WorkspaceRole)
  role: WorkspaceRole = WorkspaceRole.MEMBER;

  @IsInt()
  @Min(1)
  @Max(30)
  @IsOptional()
  expiresInDays = 7;

  @IsInt()
  @Min(1)
  @Max(1000)
  @IsOptional()
  maxUses = 1;

  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;
}

export class AcceptInvitationDto {
  @IsString()
  token!: string;

  @IsString()
  @IsOptional()
  password?: string;
}
