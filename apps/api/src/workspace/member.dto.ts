import { IsEnum, IsString, MinLength } from 'class-validator';
import { WorkspaceRole } from '@crewspace/database';

export class UpdateMemberRoleDto {
  @IsEnum(WorkspaceRole)
  role!: WorkspaceRole;
}

export class UpdateWorkspaceSettingsDto {
  @IsString()
  @MinLength(2)
  name!: string;
}
