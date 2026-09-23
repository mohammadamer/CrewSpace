import { Injectable } from '@nestjs/common';
import {
  DeviceRegistration,
  DeviceSessionHandshake,
} from '@crewspace/contracts';

@Injectable()
export class DeviceService {
  registerDevice(
    userId: string,
    workspaceId: string,
    platform: DeviceRegistration['platform'],
    deviceToken: string,
    capabilities: string[] = [],
  ): DeviceRegistration {
    if (!userId) throw new Error('User id is required');
    if (!workspaceId) throw new Error('Workspace id is required');
    if (!deviceToken.trim()) throw new Error('Device token is required');
    const now = new Date().toISOString();
    return {
      id: `device-${Date.now()}`,
      userId,
      workspaceId,
      platform,
      deviceToken: deviceToken.trim(),
      capabilities,
      registeredAt: now,
      lastSeenAt: now,
    };
  }

  createHandshake(
    clientId: string,
    workspaceId: string,
    platform: DeviceSessionHandshake['platform'],
    deviceId: string,
    appVersion: string,
    sessionVersion: number,
  ): DeviceSessionHandshake {
    if (!clientId) throw new Error('Client id is required');
    if (!workspaceId) throw new Error('Workspace id is required');
    if (!deviceId) throw new Error('Device id is required');
    if (!appVersion.trim()) throw new Error('App version is required');
    return {
      clientId,
      workspaceId,
      platform,
      deviceId,
      appVersion: appVersion.trim(),
      sessionVersion,
      connectedAt: new Date().toISOString(),
    };
  }
}
