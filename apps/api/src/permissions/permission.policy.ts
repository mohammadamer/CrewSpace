import { ForbiddenException, Injectable } from '@nestjs/common';
import { WorkspaceRole } from '@crewspace/database';

const roleRank: Record<WorkspaceRole, number> = {
  GUEST: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

@Injectable()
export class PermissionPolicy {
  requireWorkspaceRole(role: WorkspaceRole, minimum: WorkspaceRole): void {
    if (roleRank[role] < roleRank[minimum]) {
      throw new ForbiddenException(`Requires ${minimum} role`);
    }
  }

  canReadWorkspace(role: WorkspaceRole): boolean {
    return roleRank[role] >= roleRank.GUEST;
  }

  canManageWorkspace(role: WorkspaceRole): boolean {
    return roleRank[role] >= roleRank.ADMIN;
  }
}
