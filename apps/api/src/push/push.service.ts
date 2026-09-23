import { Injectable } from '@nestjs/common';
import { PushDeliveryEnvelope, PushRegistration } from '@crewspace/contracts';

@Injectable()
export class PushService {
  registerPush(
    userId: string,
    workspaceId: string,
    deviceId: string,
    platform: PushRegistration['platform'],
    token: string,
    preferences: string[] = [],
  ): PushRegistration {
    if (!userId) throw new Error('User id is required');
    if (!workspaceId) throw new Error('Workspace id is required');
    if (!deviceId) throw new Error('Device id is required');
    if (!token.trim()) throw new Error('Push token is required');
    const now = new Date().toISOString();
    return {
      id: `push-${Date.now()}`,
      userId,
      workspaceId,
      deviceId,
      platform,
      token: token.trim(),
      status: 'ENABLED',
      preferences,
      createdAt: now,
      updatedAt: now,
    };
  }

  createEnvelope(
    workspaceId: string,
    deviceId: string,
    message: string,
    priority: PushDeliveryEnvelope['priority'] = 'NORMAL',
  ): PushDeliveryEnvelope {
    if (!workspaceId) throw new Error('Workspace id is required');
    if (!deviceId) throw new Error('Device id is required');
    if (!message.trim()) throw new Error('Message is required');
    const now = new Date().toISOString();
    return {
      id: `push-envelope-${Date.now()}`,
      workspaceId,
      deviceId,
      message: message.trim(),
      dedupeKey: `${workspaceId}:${deviceId}:${message.trim()}`,
      priority,
      createdAt: now,
    };
  }
}
