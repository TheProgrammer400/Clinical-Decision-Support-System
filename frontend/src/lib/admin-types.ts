/** Shapes returned by backend/src/modules/admin. */
export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down' | 'not_configured';
  latencyMs: number | null;
  detail?: string;
}

export interface SystemHealth {
  checkedAt: string;
  components: ComponentHealth[];
  inference: ComponentHealth & { device?: string | null; gpuName?: string | null; cudaAvailable?: boolean | null; modelVersion?: string | null };
  auditWriteFailures: number;
  lastAuditFailureAt: string | null;
}

export interface AuditEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  organizationId: string | null;
  ipAddress: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  actorUser: { id: string; email: string; fullName: string; role: string } | null;
}

export interface DashboardStats {
  generatedAt: string;
  scope: 'all_organizations' | 'organization';
  topStats: { totalDoctors: number; totalQueries: number; mriAnalysesCount: number; activeAlertsCount: number; pendingRegistrationsCount: number };
  secondaryStats: {
    activeDoctorsThisMonth: number;
    queriesToday: number;
    queriesThisMonth: number;
    failedCases: number;
    mriFailures: number;
    analysesToday: number;
    analysesSucceededToday: number;
    analysesFailedToday: number;
    avgAnalysisLatencyMsToday: number | null;
  };
  systemHealth: SystemHealth;
  activeAlerts: Array<{ id: string; severity: 'warning' | 'critical'; title: string; message: string }>;
  recentAuditLogs: AuditEntry[];
}

export interface Analytics {
  days: number;
  since: string;
  totalCases: number;
  casesWithMri: number;
  casesPerDay: Array<{ date: string; count: number }>;
  analyses: { total: number; succeeded: number; failed: number; avgLatencyMs: number | null };
  successRate: number | null;
  feedback: Array<{ modelName: string; promptVersion: string; HELPFUL: number; PARTIALLY_HELPFUL: number; NOT_HELPFUL: number }>;
}

export interface AiModels {
  llm: {
    configuredModel: string;
    promptVersion: string;
    promptHash: string;
    timeoutMs: number;
    requestsTotal: number;
    successful: number;
    failed: number;
    avgLatencyMs: number | null;
    byModelAndPrompt: Array<{ modelName: string; promptVersion: string; status: string; count: number }>;
  };
  mri: { health: SystemHealth['inference']; total: number; completed: number; failed: number; processing: number; avgProcessingTimeMs: number | null };
}

export interface Doctor {
  id: string;
  fullName: string;
  email: string;
  status: 'Active' | 'Suspended';
  organizationName: string | null;
  mfaEnabled: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  queriesCount: number;
  mriQueriesCount: number;
}

export interface Settings {
  llm: { provider: string; model: string | null; timeoutMs: number };
  prompt: { version: string; hash: string };
  uploads: { maxFileSizeMb: number; maxFilesPerRequest: number; allowedFormats: string[] };
  sessions: { accessTokenTtlSeconds: number; refreshTokenTtlSeconds: number };
  mfa: { available: boolean };
  artifactStorage: string;
}
