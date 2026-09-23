export type DevicePlatform = 'WEB' | 'DESKTOP' | 'MOBILE';

export interface DeviceRegistration {
  id: string;
  userId: string;
  workspaceId: string;
  platform: DevicePlatform;
  deviceToken: string;
  capabilities: string[];
  registeredAt: string;
  lastSeenAt: string;
}

export interface DeviceSessionHandshake {
  clientId: string;
  workspaceId: string;
  platform: DevicePlatform;
  deviceId: string;
  appVersion: string;
  sessionVersion: number;
  connectedAt: string;
}
