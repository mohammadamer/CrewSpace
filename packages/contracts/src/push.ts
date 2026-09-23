export type PushDeliveryStatus = 'ENABLED' | 'DISABLED' | 'PAUSED';

export interface PushRegistration {
  id: string;
  userId: string;
  workspaceId: string;
  deviceId: string;
  platform: 'WEB' | 'DESKTOP' | 'MOBILE';
  token: string;
  status: PushDeliveryStatus;
  preferences: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PushDeliveryEnvelope {
  id: string;
  workspaceId: string;
  deviceId: string;
  message: string;
  dedupeKey: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  createdAt: string;
}
