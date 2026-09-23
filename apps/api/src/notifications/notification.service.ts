import { Injectable } from '@nestjs/common';
import { DeepLink, NotificationPayload } from '@crewspace/contracts';

@Injectable()
export class NotificationService {
  buildNotification(
    workspaceId: string,
    title: string,
    body: string,
    channel: NotificationPayload['channel'] = 'IN_APP',
    priority: NotificationPayload['priority'] = 'NORMAL',
    deepLink?: DeepLink,
  ): NotificationPayload {
    if (!workspaceId) throw new Error('Workspace scope is required');
    if (!title.trim() || !body.trim())
      throw new Error('Title and body are required');
    return {
      id: `notification-${Date.now()}`,
      workspaceId,
      channel,
      priority,
      title: title.trim(),
      body: body.trim(),
      deepLink,
      createdAt: new Date().toISOString(),
    };
  }

  validateDeepLink(link: DeepLink): DeepLink {
    if (!link.workspaceId)
      throw new Error('Deep link must include a workspace');
    if (!link.targetId) throw new Error('Deep link target id is required');
    if (!link.route.startsWith('/'))
      throw new Error('Deep link route must start with /');
    return link;
  }
}
