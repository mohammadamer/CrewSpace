export interface PlatformCapabilities {
  notifications: boolean;
  deepLinks: boolean;
  offlineCache: boolean;
}

export const webCapabilities: PlatformCapabilities = {
  notifications: 'Notification' in globalThis,
  deepLinks: true,
  offlineCache: true,
};
