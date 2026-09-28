export type ColumnKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export const COLUMN_KEYS: ColumnKey[] = ['A', 'B', 'C', 'D', 'E', 'F'];

export interface SpreadsheetRow {
  rowNumber: number; // 2-indexed (row 1 is header)
  cells: Record<ColumnKey, string>;
}

export interface SpreadsheetTab {
  id: string;
  name: string;
  description: string;
  headers: Record<ColumnKey, string>;
  columnTypes: Record<ColumnKey, 'text' | 'number' | 'email' | 'status'>;
  rows: SpreadsheetRow[];
  quickSimulations: {
    label: string;
    description: string;
    col: ColumnKey;
    rowNumber: number;
    newValue: string;
  }[];
}

export type TriggerScopeType = 'column' | 'range' | 'cell';

export type TriggerOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'contains'
  | 'changes_to'
  | 'changes_from_to'
  | 'not_empty';

export type CooldownPolicy =
  | 'immediate'
  | 'once_per_row_value'
  | 'throttle_15m'
  | 'daily_once';

export interface CellTriggerRule {
  id: string;
  name: string;
  enabled: boolean;
  sheetId: string; // specific sheet ID or 'ALL'
  scopeType: TriggerScopeType;
  column: ColumnKey;
  range: string; // e.g., 'D2:D50'
  cell: string; // e.g., 'E4'
  operator: TriggerOperator;
  value: string;
  previousValue?: string;
  cooldown: CooldownPolicy;
  recipientTemplate: string;
  ccTemplate: string;
  subjectTemplate: string;
  bodyTemplate: string;
  includeRowSnapshot: boolean;
  priority: 'normal' | 'high';
  lastTriggeredAt: string | null;
  triggerCount: number;
}

export type ReportCadence = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'cron';

export type ReportFormat = 'html_table' | 'csv_attachment' | 'both';

export interface ReportSchedule {
  id: string;
  name: string;
  enabled: boolean;
  sheetId: string;
  filterEnabled: boolean;
  filterColumn: ColumnKey;
  filterOperator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  filterValue: string;
  cadence: ReportCadence;
  cronExpression: string;
  daysOfWeek: number[]; // 0=Sun, 1=Mon, ... 6=Sat
  timeOfDay: string; // 'HH:mm'
  timezone: string;
  recipients: string;
  subjectTemplate: string;
  introNotes: string;
  format: ReportFormat;
  includeSummaryKpis: boolean;
  summaryNumericColumn: ColumnKey;
  lastRunAt: string | null;
  runCount: number;
}

export type SmtpProviderMode = 'custom_smtp' | 'apps_script_native' | 'hybrid_fallback';

export type SmtpEncryption = 'STARTTLS' | 'SSL_TLS' | 'NONE';

export interface SmtpConfig {
  providerMode: SmtpProviderMode;
  executionMode: 'sandbox' | 'live';
  presetName: string;
  host: string;
  port: number;
  encryption: SmtpEncryption;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  webhookRelayUrl: string;
  webhookSecret: string;
  maxRetries: number;
  timeoutMs: number;
  rateLimitPerHour: number;
  customHeaders: { key: string; value: string }[];
}

export interface DispatchLogEntry {
  id: string;
  timestamp: string;
  sourceType: 'cell_trigger' | 'scheduled_report' | 'manual_test';
  sourceName: string;
  sheetName: string;
  cellCoord: string;
  oldValue: string;
  newValue: string;
  recipient: string;
  cc?: string;
  subject: string;
  htmlBody: string;
  rawMime: string;
  status: 'sent' | 'simulated' | 'throttled' | 'failed';
  transportUsed: string;
  messageId: string;
  durationMs: number;
  smtpTranscript: string[];
  interpolatedVars: Record<string, string>;
}

export type WorkspaceTab = 'triggers' | 'schedules' | 'smtp' | 'export';
