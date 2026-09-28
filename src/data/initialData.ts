import {
  CellTriggerRule,
  DispatchLogEntry,
  ReportSchedule,
  SmtpConfig,
  SpreadsheetTab,
} from '../types/extension';

export const INITIAL_SHEETS: SpreadsheetTab[] = [
  {
    id: 'sheet_inventory',
    name: 'Inventory & Stock',
    description: 'Warehouse SKU telemetry, reorder thresholds, and buyer routing',
    headers: {
      A: 'SKU ID',
      B: 'Component Name',
      C: 'Warehouse Zone',
      D: 'Stock Units',
      E: 'Supply Status',
      F: 'Responsible Buyer',
    },
    columnTypes: {
      A: 'text',
      B: 'text',
      C: 'text',
      D: 'number',
      E: 'status',
      F: 'email',
    },
    rows: [
      {
        rowNumber: 2,
        cells: {
          A: 'SKU-4092',
          B: 'LiFePO4 Battery Module 48V',
          C: 'Austin-TX-01',
          D: '42',
          E: 'Nominal',
          F: 'elena.rostova@voltgrid.io',
        },
      },
      {
        rowNumber: 3,
        cells: {
          A: 'SKU-4108',
          B: 'SiC Inverter Gate Driver',
          C: 'Austin-TX-02',
          D: '19',
          E: 'Watch',
          F: 'marcus.chen@voltgrid.io',
        },
      },
      {
        rowNumber: 4,
        cells: {
          A: 'SKU-4155',
          B: 'High-Voltage Contactor Relay',
          C: 'Reno-NV-01',
          D: '28',
          E: 'Nominal',
          F: 'elena.rostova@voltgrid.io',
        },
      },
      {
        rowNumber: 5,
        cells: {
          A: 'SKU-4201',
          B: 'Thermal Interface Pad 3mm',
          C: 'Munich-DE-04',
          D: '11',
          E: 'Low Stock',
          F: 'lukas.weber@voltgrid.io',
        },
      },
      {
        rowNumber: 6,
        cells: {
          A: 'SKU-4279',
          B: 'CAN-Bus Telemetry Harness',
          C: 'Austin-TX-01',
          D: '64',
          E: 'Nominal',
          F: 'marcus.chen@voltgrid.io',
        },
      },
      {
        rowNumber: 7,
        cells: {
          A: 'SKU-4312',
          B: 'DC-DC Buck Converter 24V',
          C: 'Reno-NV-01',
          D: '8',
          E: 'Critical',
          F: 'sara.jenkins@voltgrid.io',
        },
      },
      {
        rowNumber: 8,
        cells: {
          A: 'SKU-4380',
          B: 'Anodized Busbar Assembly',
          C: 'Munich-DE-04',
          D: '95',
          E: 'Nominal',
          F: 'lukas.weber@voltgrid.io',
        },
      },
      {
        rowNumber: 9,
        cells: {
          A: 'SKU-4410',
          B: 'Hall-Effect Current Sensor',
          C: 'Austin-TX-02',
          D: '16',
          E: 'Watch',
          F: 'sara.jenkins@voltgrid.io',
        },
      },
    ],
    quickSimulations: [
      {
        label: 'Breach Stock (< 15) on D4',
        description: 'Sets D4 (High-Voltage Contactor Relay) from 28 to 9 units',
        col: 'D',
        rowNumber: 4,
        newValue: '9',
      },
      {
        label: 'Escalate Status on E3 → Critical',
        description: 'Sets E3 (SiC Inverter Gate Driver) status to Critical',
        col: 'E',
        rowNumber: 3,
        newValue: 'Critical',
      },
      {
        label: 'Drop D9 to 6 Units',
        description: 'Sets D9 (Hall-Effect Current Sensor) to 6 units',
        col: 'D',
        rowNumber: 9,
        newValue: '6',
      },
    ],
  },
  {
    id: 'sheet_revenue',
    name: 'SaaS Revenue Ledger',
    description: 'Enterprise ARR contracts, expansion triggers, and renewal health alerts',
    headers: {
      A: 'Contract ID',
      B: 'Enterprise Customer',
      C: 'Plan Tier',
      D: 'ARR (USD)',
      E: 'Renewal Health',
      F: 'Account Owner',
    },
    columnTypes: {
      A: 'text',
      B: 'text',
      C: 'text',
      D: 'number',
      E: 'status',
      F: 'email',
    },
    rows: [
      {
        rowNumber: 2,
        cells: {
          A: 'CTR-8810',
          B: 'Kestrel Aerospace Systems',
          C: 'Enterprise Plus',
          D: '148000',
          E: 'Healthy',
          F: 'claire.dupont@sheetpulse.io',
        },
      },
      {
        rowNumber: 3,
        cells: {
          A: 'CTR-8842',
          B: 'Northstar Logistics Group',
          C: 'Enterprise',
          D: '92500',
          E: 'At Risk',
          F: 'david.kim@sheetpulse.io',
        },
      },
      {
        rowNumber: 4,
        cells: {
          A: 'CTR-8895',
          B: 'Vanguard BioLabs Inc',
          C: 'Scale',
          D: '54000',
          E: 'Healthy',
          F: 'claire.dupont@sheetpulse.io',
        },
      },
      {
        rowNumber: 5,
        cells: {
          A: 'CTR-8911',
          B: 'Meridian FinTech Holdings',
          C: 'Enterprise Plus',
          D: '215000',
          E: 'Expansion Ready',
          F: 'ariel.bennett@sheetpulse.io',
        },
      },
      {
        rowNumber: 6,
        cells: {
          A: 'CTR-8960',
          B: 'Helios Semiconductor',
          C: 'Enterprise',
          D: '118000',
          E: 'Healthy',
          F: 'david.kim@sheetpulse.io',
        },
      },
      {
        rowNumber: 7,
        cells: {
          A: 'CTR-9004',
          B: 'Apex Robotics GmbH',
          C: 'Scale',
          D: '46000',
          E: 'At Risk',
          F: 'ariel.bennett@sheetpulse.io',
        },
      },
    ],
    quickSimulations: [
      {
        label: 'Flag Kestrel (E2) → At Risk',
        description: 'Changes E2 Renewal Health to At Risk on $148k contract',
        col: 'E',
        rowNumber: 2,
        newValue: 'At Risk',
      },
      {
        label: 'Upgrade Helios ARR (D6) → 185000',
        description: 'Increases D6 ARR above $150,000 threshold',
        col: 'D',
        rowNumber: 6,
        newValue: '185000',
      },
    ],
  },
  {
    id: 'sheet_sla',
    name: 'SLA Incident Queue',
    description: 'Production response timers, P1 escalations, and on-call paging',
    headers: {
      A: 'Incident ID',
      B: 'Service Cluster',
      C: 'Severity',
      D: 'Elapsed Mins',
      E: 'Incident State',
      F: 'On-Call Engineer',
    },
    columnTypes: {
      A: 'text',
      B: 'text',
      C: 'text',
      D: 'number',
      E: 'status',
      F: 'email',
    },
    rows: [
      {
        rowNumber: 2,
        cells: {
          A: 'INC-2901',
          B: 'EU-Central Auth Gateway',
          C: 'SEV-2',
          D: '14',
          E: 'Investigating',
          F: 'devon.patel@sheetpulse.io',
        },
      },
      {
        rowNumber: 3,
        cells: {
          A: 'INC-2904',
          B: 'US-East Webhook Dispatcher',
          C: 'SEV-1',
          D: '38',
          E: 'Breached SLA',
          F: 'nina.solis@sheetpulse.io',
        },
      },
      {
        rowNumber: 4,
        cells: {
          A: 'INC-2909',
          B: 'Billing Sync Worker Pool',
          C: 'SEV-3',
          D: '22',
          E: 'Mitigated',
          F: 'devon.patel@sheetpulse.io',
        },
      },
      {
        rowNumber: 5,
        cells: {
          A: 'INC-2915',
          B: 'PostgreSQL Read Replica 03',
          C: 'SEV-1',
          D: '19',
          E: 'Investigating',
          F: 'nina.solis@sheetpulse.io',
        },
      },
    ],
    quickSimulations: [
      {
        label: 'Breach SLA Timer (D5 → 45m)',
        description: 'Sets INC-2915 elapsed response minutes to 45 (> 30m limit)',
        col: 'D',
        rowNumber: 5,
        newValue: '45',
      },
    ],
  },
];

export const INITIAL_TRIGGERS: CellTriggerRule[] = [
  {
    id: 'trg_low_stock',
    name: 'Low Inventory Threshold (< 15 Units)',
    enabled: true,
    sheetId: 'sheet_inventory',
    scopeType: 'range',
    column: 'D',
    range: 'D2:D50',
    cell: 'D4',
    operator: 'less_than',
    value: '15',
    cooldown: 'once_per_row_value',
    recipientTemplate: '{{F}}, procurement-desk@voltgrid.io',
    ccTemplate: 'warehouse-ops@voltgrid.io',
    subjectTemplate: '[Restock Alert] {{A}} ({{B}}) dropped to {{newValue}} units in {{C}}',
    bodyTemplate:
      'Automated cell trigger detected a stock threshold breach in sheet "{{sheetName}}" at row {{row}} ({{cell}}).\n\nComponent: {{B}} ({{A}})\nWarehouse Zone: {{C}}\nPrevious Quantity: {{oldValue}} units\nCurrent Quantity: {{newValue}} units\nStatus: {{E}}\n\nPlease initiate a replenishment purchase order with the assigned supplier.',
    includeRowSnapshot: true,
    priority: 'high',
    lastTriggeredAt: '2026-09-27T17:42:10Z',
    triggerCount: 14,
  },
  {
    id: 'trg_critical_status',
    name: 'Supply Status Escalated to Critical',
    enabled: true,
    sheetId: 'sheet_inventory',
    scopeType: 'column',
    column: 'E',
    range: 'E2:E100',
    cell: 'E3',
    operator: 'changes_to',
    value: 'Critical',
    cooldown: 'immediate',
    recipientTemplate: '{{F}}, vp-supplychain@voltgrid.io',
    ccTemplate: '',
    subjectTemplate: 'URGENT: {{A}} marked Critical in {{C}} (Row {{row}})',
    bodyTemplate:
      'Supply status for {{B}} ({{A}}) was escalated from "{{oldValue}}" to "{{newValue}}" in {{sheetName}}.\n\nCurrent Stock Level: {{D}} units\nAssigned Buyer: {{F}}\n\nImmediate expedite review required.',
    includeRowSnapshot: true,
    priority: 'high',
    lastTriggeredAt: '2026-09-27T16:15:00Z',
    triggerCount: 6,
  },
  {
    id: 'trg_arr_at_risk',
    name: 'Enterprise Renewal Health At Risk',
    enabled: true,
    sheetId: 'sheet_revenue',
    scopeType: 'column',
    column: 'E',
    range: 'E2:E100',
    cell: 'E2',
    operator: 'equals',
    value: 'At Risk',
    cooldown: 'once_per_row_value',
    recipientTemplate: '{{F}}, revops-alerts@sheetpulse.io',
    ccTemplate: 'cs-leadership@sheetpulse.io',
    subjectTemplate: '[Renewal Risk] {{B}} ({{A}} — ${{D}} ARR) flagged At Risk',
    bodyTemplate:
      'Account health trigger fired on {{sheetName}} (Cell {{cell}}).\n\nCustomer: {{B}}\nContract ID: {{A}}\nPlan Tier: {{C}}\nAnnual Recurring Revenue: ${{D}}\nHealth State: {{newValue}}\n\nPlease schedule an executive sponsor check-in within 48 hours.',
    includeRowSnapshot: true,
    priority: 'high',
    lastTriggeredAt: '2026-09-27T14:20:00Z',
    triggerCount: 9,
  },
  {
    id: 'trg_arr_expansion',
    name: 'Major ARR Expansion (> $150,000)',
    enabled: true,
    sheetId: 'sheet_revenue',
    scopeType: 'range',
    column: 'D',
    range: 'D2:D100',
    cell: 'D6',
    operator: 'greater_than',
    value: '150000',
    cooldown: 'once_per_row_value',
    recipientTemplate: '{{F}}, deal-desk@sheetpulse.io',
    ccTemplate: '',
    subjectTemplate: '[Enterprise Deal Milestone] {{B}} reached ${{newValue}} ARR',
    bodyTemplate:
      'Contract {{A}} for {{B}} was updated from ${{oldValue}} to ${{newValue}} ARR in {{sheetName}}.\n\nTier: {{C}}\nRenewal Status: {{E}}\nAccount Owner: {{F}}',
    includeRowSnapshot: true,
    priority: 'normal',
    lastTriggeredAt: null,
    triggerCount: 3,
  },
  {
    id: 'trg_sla_breach',
    name: 'SLA Response Timer Breach (> 30 Mins)',
    enabled: true,
    sheetId: 'sheet_sla',
    scopeType: 'range',
    column: 'D',
    range: 'D2:D50',
    cell: 'D5',
    operator: 'greater_than',
    value: '30',
    cooldown: 'immediate',
    recipientTemplate: '{{F}}, sre-pager@sheetpulse.io',
    ccTemplate: '',
    subjectTemplate: '[SLA BREACH] {{A}} ({{B}}) exceeded 30m response window ({{newValue}}m)',
    bodyTemplate:
      'Incident {{A}} on {{B}} ({{C}}) has reached {{newValue}} elapsed minutes (threshold: 30m).\n\nCurrent Incident State: {{E}}\nAssigned On-Call: {{F}}',
    includeRowSnapshot: true,
    priority: 'high',
    lastTriggeredAt: '2026-09-27T18:05:12Z',
    triggerCount: 5,
  },
];

export const INITIAL_SCHEDULES: ReportSchedule[] = [
  {
    id: 'sch_morning_restock',
    name: 'Morning Warehouse Restock Digest',
    enabled: true,
    sheetId: 'sheet_inventory',
    filterEnabled: true,
    filterColumn: 'D',
    filterOperator: 'less_than',
    filterValue: '25',
    cadence: 'daily',
    cronExpression: '0 8 * * 1-5',
    daysOfWeek: [1, 2, 3, 4, 5],
    timeOfDay: '08:00',
    timezone: 'America/Chicago',
    recipients: 'procurement-desk@voltgrid.io, elena.rostova@voltgrid.io',
    subjectTemplate: 'Daily Low-Stock Replenishment Digest — {{sheetName}} ({{date}})',
    introNotes:
      'Automated morning rollup of all warehouse SKUs currently below the 25-unit safety buffer across Austin, Reno, and Munich facilities.',
    format: 'both',
    includeSummaryKpis: true,
    summaryNumericColumn: 'D',
    lastRunAt: '2026-09-27T08:00:02Z',
    runCount: 42,
  },
  {
    id: 'sch_weekly_arr',
    name: 'Friday Executive ARR & Renewal Rollup',
    enabled: true,
    sheetId: 'sheet_revenue',
    filterEnabled: false,
    filterColumn: 'E',
    filterOperator: 'equals',
    filterValue: 'At Risk',
    cadence: 'weekly',
    cronExpression: '30 16 * * 5',
    daysOfWeek: [5],
    timeOfDay: '16:30',
    timezone: 'America/New_York',
    recipients: 'exec-staff@sheetpulse.io, revops-alerts@sheetpulse.io',
    subjectTemplate: 'Weekly Enterprise ARR Ledger & Health Summary ({{date}})',
    introNotes:
      'End-of-week snapshot of active enterprise contracts, total book of business ARR, and accounts flagged for renewal intervention.',
    format: 'html_table',
    includeSummaryKpis: true,
    summaryNumericColumn: 'D',
    lastRunAt: '2026-09-25T20:30:00Z',
    runCount: 18,
  },
  {
    id: 'sch_cron_sla',
    name: 'Bi-Hourly SEV-1 Incident Pulse',
    enabled: true,
    sheetId: 'sheet_sla',
    filterEnabled: true,
    filterColumn: 'C',
    filterOperator: 'equals',
    filterValue: 'SEV-1',
    cadence: 'cron',
    cronExpression: '0 */2 * * 1-5',
    daysOfWeek: [1, 2, 3, 4, 5],
    timeOfDay: '10:00',
    timezone: 'UTC',
    recipients: 'sre-pager@sheetpulse.io, nina.solis@sheetpulse.io',
    subjectTemplate: '[SRE Pulse] Active SEV-1 Queue Snapshot — {{date}}',
    introNotes:
      'Custom cron schedule (every 2 hours on weekdays) compiling all active SEV-1 incidents and their elapsed response durations.',
    format: 'html_table',
    includeSummaryKpis: true,
    summaryNumericColumn: 'D',
    lastRunAt: '2026-09-27T18:00:00Z',
    runCount: 109,
  },
];

export const INITIAL_SMTP_CONFIG: SmtpConfig = {
  providerMode: 'custom_smtp',
  executionMode: 'sandbox',
  presetName: 'SendGrid SMTP Relay',
  host: 'smtp.sendgrid.net',
  port: 587,
  encryption: 'STARTTLS',
  username: 'apikey',
  password: 'SG.v9x82_sheetpulse_live_relay_token_9941a',
  fromName: 'SheetPulse Automation',
  fromEmail: 'notifications@voltgrid.io',
  replyTo: 'ops-support@voltgrid.io',
  webhookRelayUrl: 'https://relay.voltgrid.io/v1/smtp-bridge',
  webhookSecret: 'whsec_sp_8831094a7c2f9e1b4d08',
  maxRetries: 3,
  timeoutMs: 10000,
  rateLimitPerHour: 120,
  customHeaders: [
    { key: 'X-SheetPulse-Extension', value: 'v2.4-AppsScript' },
    { key: 'X-Auto-Response-Suppress', value: 'All' },
  ],
};

export const SMTP_PRESETS: {
  name: string;
  host: string;
  port: number;
  encryption: 'STARTTLS' | 'SSL_TLS' | 'NONE';
  usernameHint: string;
  notes: string;
}[] = [
  {
    name: 'SendGrid SMTP Relay',
    host: 'smtp.sendgrid.net',
    port: 587,
    encryption: 'STARTTLS',
    usernameHint: 'apikey',
    notes: 'Use literal string "apikey" as username and your SendGrid API Key as password.',
  },
  {
    name: 'Amazon SES (US-East-1)',
    host: 'email-smtp.us-east-1.amazonaws.com',
    port: 587,
    encryption: 'STARTTLS',
    usernameHint: 'AKIAIOSFODNN7EXAMPLE',
    notes: 'Requires IAM SMTP credentials generated in the AWS SES Console.',
  },
  {
    name: 'Postmark Transactional',
    host: 'smtp.postmarkapp.com',
    port: 587,
    encryption: 'STARTTLS',
    usernameHint: 'server-api-token',
    notes: 'Use your Postmark Server API Token for both username and password.',
  },
  {
    name: 'Mailgun SMTP',
    host: 'smtp.mailgun.org',
    port: 587,
    encryption: 'STARTTLS',
    usernameHint: 'postmaster@mg.yourdomain.com',
    notes: 'Standard transactional relay with domain-level DKIM signing.',
  },
  {
    name: 'Google Workspace SMTP Relay',
    host: 'smtp-relay.gmail.com',
    port: 465,
    encryption: 'SSL_TLS',
    usernameHint: 'automation@yourdomain.com',
    notes: 'Supports Google Workspace App Passwords or IP-allowlisted relay.',
  },
  {
    name: 'Custom Private SMTP',
    host: 'mail.internal-corp.net',
    port: 2525,
    encryption: 'STARTTLS',
    usernameHint: 'svc-sheets-notifier',
    notes: 'Self-hosted Postfix / Haraka / Exim relay on custom port.',
  },
];

export const INITIAL_DISPATCH_LOGS: DispatchLogEntry[] = [
  {
    id: 'log_init_1',
    timestamp: '2026-09-27T18:14:22Z',
    sourceType: 'cell_trigger',
    sourceName: 'Low Inventory Threshold (< 15 Units)',
    sheetName: 'Inventory & Stock',
    cellCoord: 'D7',
    oldValue: '19',
    newValue: '8',
    recipient: 'sara.jenkins@voltgrid.io, procurement-desk@voltgrid.io',
    cc: 'warehouse-ops@voltgrid.io',
    subject: '[Restock Alert] SKU-4312 (DC-DC Buck Converter 24V) dropped to 8 units in Reno-NV-01',
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0F172A; max-width: 620px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
  <div style="background: #0F172A; color: #FFFFFF; padding: 16px 20px;">
    <div style="font-size: 11px; color: #10B981; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;">SheetPulse Cell Trigger Notification</div>
    <div style="font-size: 16px; font-weight: 600; margin-top: 4px;">[Restock Alert] SKU-4312 (DC-DC Buck Converter 24V) dropped to 8 units</div>
  </div>
  <div style="padding: 20px; background: #FFFFFF; font-size: 14px; line-height: 1.6;">
    <p style="margin-top: 0;">Automated cell trigger detected a stock threshold breach in sheet <strong>Inventory &amp; Stock</strong> at row <strong>7</strong> (<code>D7</code>).</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
      <tr style="background: #F8FAFC; border-bottom: 1px solid #E2E8F0;">
        <th style="text-align: left; padding: 8px 12px; color: #64748B;">SKU ID</th>
        <th style="text-align: left; padding: 8px 12px; color: #64748B;">Component Name</th>
        <th style="text-align: left; padding: 8px 12px; color: #64748B;">Zone</th>
        <th style="text-align: right; padding: 8px 12px; color: #64748B;">Stock Units</th>
        <th style="text-align: left; padding: 8px 12px; color: #64748B;">Status</th>
      </tr>
      <tr style="border-bottom: 1px solid #E2E8F0;">
        <td style="padding: 10px 12px; font-family: monospace;">SKU-4312</td>
        <td style="padding: 10px 12px;">DC-DC Buck Converter 24V</td>
        <td style="padding: 10px 12px;">Reno-NV-01</td>
        <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-weight: 700; color: #DC2626;">8 (was 19)</td>
        <td style="padding: 10px 12px;">Critical</td>
      </tr>
    </table>
    <p style="color: #475569; margin-bottom: 0;">Please initiate a replenishment purchase order with the assigned supplier.</p>
  </div>
</div>`,
    rawMime: `From: "SheetPulse Automation" <notifications@voltgrid.io>
To: sara.jenkins@voltgrid.io, procurement-desk@voltgrid.io
Cc: warehouse-ops@voltgrid.io
Subject: [Restock Alert] SKU-4312 (DC-DC Buck Converter 24V) dropped to 8 units in Reno-NV-01
Message-ID: <sp-1759025662-a89f2c@voltgrid.io>
X-SheetPulse-Extension: v2.4-AppsScript
X-SheetPulse-Trigger-Rule: Low Inventory Threshold (< 15 Units)
X-SheetPulse-Cell: Inventory & Stock!D7
MIME-Version: 1.0
Content-Type: text/html; charset=UTF-8`,
    status: 'simulated',
    transportUsed: 'smtp.sendgrid.net:587 (STARTTLS)',
    messageId: '<sp-1759025662-a89f2c@voltgrid.io>',
    durationMs: 118,
    smtpTranscript: [
      '220 smtp.sendgrid.net ESMTP SheetPulse-Relay (STARTTLS on port 587)',
      '> EHLO sheetpulse-bridge.internal',
      '250-STARTTLS / AUTH PLAIN',
      '235 2.7.0 Authenticated as "apikey"',
      '> MAIL FROM:<notifications@voltgrid.io> BODY=8BITMIME',
      '250 2.1.0 Originator <notifications@voltgrid.io> OK',
      '> RCPT TO:<sara.jenkins@voltgrid.io>',
      '250 2.1.5 Recipient <sara.jenkins@voltgrid.io> OK',
      '> DATA',
      '250 2.0.0 OK: queued as sp-1759025662-a89f2c via smtp.sendgrid.net:587 (118ms)',
    ],
    interpolatedVars: {
      A: 'SKU-4312',
      B: 'DC-DC Buck Converter 24V',
      C: 'Reno-NV-01',
      D: '8',
      E: 'Critical',
      F: 'sara.jenkins@voltgrid.io',
      row: '7',
      cell: 'D7',
      oldValue: '19',
      newValue: '8',
      sheetName: 'Inventory & Stock',
    },
  },
];
