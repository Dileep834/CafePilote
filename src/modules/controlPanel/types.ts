import type { LucideIcon } from 'lucide-react';
import type { PermissionId } from '@/constants/permissions';
import type { PlanModuleId } from '@/lib/planLimits';
import type { FeatureFlagKey } from '@/lib/featureFlags';

export type ControlStatus = 'live' | 'partial' | 'planned' | 'demo';

export type HealthLevel = 'healthy' | 'warning' | 'critical' | 'unknown';

export type ControlTopic = {
  id: string;
  label: string;
  keywords: string[];
  href?: string;
  status?: ControlStatus;
};

export type ControlModule = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Primary deep-link when card is opened */
  href: string;
  quickActionLabel: string;
  topics: ControlTopic[];
  requiredPermission?: PermissionId;
  requiredPlanModule?: PlanModuleId;
  featureFlag?: FeatureFlagKey;
  status: ControlStatus;
};

export type ControlKpi = {
  id: string;
  label: string;
  value: string;
  subtitle: string;
  tone: 'slate' | 'emerald' | 'amber' | 'red' | 'blue' | 'orange';
  href?: string;
};

export type HealthItem = {
  id: string;
  label: string;
  level: HealthLevel;
  detail: string;
  lastChecked: string;
};

export type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  at: string;
  kind: string;
};

export type QuickAction = {
  id: string;
  label: string;
  href: string;
  requiredPermission?: PermissionId;
};

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export type PendingTask = {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  actionLabel: string;
  href: string;
};

export type IntegrationStatus = 'connected' | 'disconnected' | 'pending';

export type IntegrationCard = {
  id: string;
  name: string;
  status: IntegrationStatus;
  version: string;
  lastSync: string | null;
  href: string;
};

export type LicenseInfo = {
  planLabel: string;
  licenseKey: string;
  expiry: string;
  storageUsedPct: number;
  storageLabel: string;
  apiCallsUsed: number;
  apiCallsLimit: number;
  smsCredits: number;
  whatsappCredits: number;
};

export type UsageMetric = {
  id: string;
  label: string;
  value: string;
  pct?: number;
  spark?: number[];
};

export type SecurityInfo = {
  activeSessions: number;
  failedLogins: number;
  passwordExpiryDays: number | null;
  twoFactorEnabled: boolean;
  managerPinConfigured: boolean;
  auditEventsToday: number;
  blockedUsers: number;
};

export type BackupInfo = {
  lastBackupAt: string | null;
  status: 'ok' | 'overdue' | 'never' | 'running';
  restorePoint: string | null;
  schedule: string;
};

export type DeveloperInfo = {
  apiKeyCount: number;
  webhookEventsToday: number;
  featureFlagCount: number;
  environment: string;
  debugMode: boolean;
  version: string;
};

export type PlatformMetric = {
  id: string;
  label: string;
  value: string;
  tone: 'slate' | 'emerald' | 'amber' | 'red' | 'blue' | 'orange';
  spark?: number[];
};

export type OpsMonitoringData = {
  health: HealthItem[];
  activity: ActivityItem[];
  tasks: PendingTask[];
  integrations: IntegrationCard[];
  license: LicenseInfo;
  usage: UsageMetric[];
  security: SecurityInfo;
  backup: BackupInfo;
  developer: DeveloperInfo;
  metrics: PlatformMetric[];
  checkedAt: string;
};
