export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'PUSH' | 'SYSTEM';
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH';

export interface DeepLink {
  workspaceId: string;
  target: 'workspace' | 'agent' | 'task' | 'conversation' | 'decision';
  targetId: string;
  route: string;
}

export interface NotificationPayload {
  id: string;
  workspaceId: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  title: string;
  body: string;
  actorUserId?: string;
  deepLink?: DeepLink;
  createdAt: string;
}
