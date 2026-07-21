import type { FeatureFlagKey } from '@/lib/featureFlags';

/** Maps Control Panel module ids → progressive feature flags */
export const CONTROL_MODULE_FLAGS: Record<string, FeatureFlagKey> = {
  business: 'settings',
  outlets: 'franchise',
  users: 'staff',
  pos: 'pos',
  payments: 'payments',
  inventory: 'inventory',
  online: 'onlineOrders',
  ai: 'aiCopilot',
  reports: 'reports',
  notifications: 'notifications',
  hardware: 'settings',
  integrations: 'apiPlatform',
  branding: 'whiteLabel',
  compliance: 'compliance',
  health: 'systemHealth',
  developer: 'developerTools',
};
