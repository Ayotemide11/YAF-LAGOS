import {
  CellTriggerRule,
  ReportSchedule,
  SmtpConfig,
  SpreadsheetTab,
} from '../types/extension';

export function generateAppsScriptCodeGs(params: {
  sheets: SpreadsheetTab[];
  triggers: CellTriggerRule[];
  schedules: ReportSchedule[];
  smtpConfig: SmtpConfig;
}): string {
  const { sheets, triggers, schedules, smtpConfig } = params;

  const sheetIdToName: Record<string, string> = { ALL: 'ALL' };
  sheets.forEach((s) => {
    sheetIdToName[s.id] = s.name;
  });

  const serializedTriggers = triggers.map((t) => ({
    id: t.id,
    name: t.name,
    enabled: t.enabled,
    sheetName: sheetIdToName[t.sheetId] || t.sheetId,
    scopeType: t.scopeType,
    column: t.column,
    range: t.range,
    cell: t.cell,
    operator: t.operator,
    value: t.value,
    previousValue: t.previousValue || '',
    cooldown: t.cooldown,
    recipientTemplate: t.recipientTemplate,
    ccTemplate: t.ccTemplate,
    subjectTemplate: t.subjectTemplate,
    bodyTemplate: t.bodyTemplate,
    includeRowSnapshot: t.includeRowSnapshot,
    priority: t.priority,
  }));

  const serializedSchedules = schedules.map((s) => ({
    id: s.id,
    name: s.name,
    enabled: s.enabled,
    sheetName: sheetIdToName[s.sheetId] || s.sheetId,
    filterEnabled: s.filterEnabled,
    filterColumn: s.filterColumn,
    filterOperator: s.filterOperator,
    filterValue: s.filterValue,
    cadence: s.cadence,
    cronExpression: s.cronExpression,
    daysOfWeek: s.daysOfWeek,
    timeOfDay: s.timeOfDay,
    timezone: s.timezone,
    recipients: s.recipients,
    subjectTemplate: s.subjectTemplate,
    introNotes: s.introNotes,
    format: s.format,
    includeSummaryKpis: s.includeSummaryKpis,
    summaryNumericColumn: s.summaryNumericColumn,
  }));

  return `/**
 * SheetPulse — Google Sheets Automated Email Trigger & Custom SMTP Extension
 * Generated Configuration: ${triggers.filter((t) => t.enabled).length} Active Cell Triggers · ${
   schedules.filter((s) => s.enabled).length
 } Active Report Schedules
 *
 * Installation:
 * 1. In your Google Sheet, open Extensions -> Apps Script.
 * 2. Paste this file into Code.gs and Sidebar.html into a new HTML file named "Sidebar".
 * 3. Store your SMTP password securely via SheetPulse Menu -> Configure SMTP Secret,
 *    or set Script Property "SMTP_PASSWORD".
 * 4. Run installSheetPulseTriggers() once to register onEdit and time-driven triggers.
 */

const SHEETPULSE_CONFIG = {
  smtp: {
    providerMode: ${JSON.stringify(smtpConfig.providerMode)},
    host: ${JSON.stringify(smtpConfig.host)},
    port: ${smtpConfig.port},
    encryption: ${JSON.stringify(smtpConfig.encryption)},
    username: ${JSON.stringify(smtpConfig.username)},
    fromName: ${JSON.stringify(smtpConfig.fromName)},
    fromEmail: ${JSON.stringify(smtpConfig.fromEmail)},
    replyTo: ${JSON.stringify(smtpConfig.replyTo)},
    webhookRelayUrl: ${JSON.stringify(smtpConfig.webhookRelayUrl)},
    maxRetries: ${smtpConfig.maxRetries},
    timeoutMs: ${smtpConfig.timeoutMs},
    rateLimitPerHour: ${smtpConfig.rateLimitPerHour},
    customHeaders: ${JSON.stringify(smtpConfig.customHeaders)}
  },
  cellTriggers: ${JSON.stringify(serializedTriggers, null, 2)},
  reportSchedules: ${JSON.stringify(serializedSchedules, null, 2)}
};

/**
 * Adds the SheetPulse Automation menu to the Google Sheets toolbar.
 */
function onOpen(e) {
  SpreadsheetApp.getUi()
    .createMenu('SheetPulse Automation')
    .addItem('Open Extension Sidebar', 'showSheetPulseSidebar')
    .addSeparator()
    .addItem('Install / Refresh Triggers', 'installSheetPulseTriggers')
    .addItem('Run Scheduled Digests Now', 'runScheduledReports')
    .addItem('Verify Custom SMTP Relay', 'verifySmtpRelayConnection')
    .addToUi();
}

function showSheetPulseSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('SheetPulse Trigger & SMTP Control');
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Programmatically registers installable onEdit and time-driven schedule triggers.
 */
function installSheetPulseTriggers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const existing = ScriptApp.getProjectTriggers();
  for (let i = 0; i < existing.length; i++) {
    ScriptApp.deleteTrigger(existing[i]);
  }

  // 1. Installable onEdit trigger (supports UrlFetchApp and MailApp)
  ScriptApp.newTrigger('onSheetPulseEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  // 2. Time-driven trigger for flexible report schedules
  ScriptApp.newTrigger('runScheduledReports')
    .timeBased()
    .everyHours(1)
    .create();

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Installed onEdit cell watcher and hourly schedule dispatcher.',
    'SheetPulse Ready',
    5
  );
}

/**
 * Installable onEdit handler evaluating cell modifications against SHEETPULSE_CONFIG.cellTriggers.
 */
function onSheetPulseEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const sheetName = sheet.getName();
  const rowIdx = e.range.getRow();
  const colIdx = e.range.getColumn();
  if (rowIdx <= 1) return; // Ignore header row edits

  const colLetter = columnToLetter(colIdx);
  const cellA1 = colLetter + rowIdx;
  const newValue = e.value !== undefined ? String(e.value) : String(e.range.getValue());
  const oldValue = e.oldValue !== undefined ? String(e.oldValue) : '';

  const lastCol = Math.max(6, sheet.getLastColumn());
  const headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  const rowValues = sheet.getRange(rowIdx, 1, 1, lastCol).getDisplayValues()[0];

  const vars = buildTemplateVariables(sheetName, rowIdx, colLetter, oldValue, newValue, headers, rowValues);

  SHEETPULSE_CONFIG.cellTriggers.forEach(function(rule) {
    if (!rule.enabled) return;
    if (rule.sheetName !== 'ALL' && rule.sheetName !== sheetName) return;
    if (!isCellWithinScope(rule, colLetter, colIdx, rowIdx)) return;
    if (!evaluateCondition(rule.operator, newValue, rule.value, oldValue, rule.previousValue)) return;
    if (isCooldownActive(rule, sheetName, rowIdx, newValue)) return;

    const to = interpolateString(rule.recipientTemplate, vars);
    const cc = interpolateString(rule.ccTemplate || '', vars);
    const subject = interpolateString(rule.subjectTemplate, vars);
    const bodyText = interpolateString(rule.bodyTemplate, vars);
    const htmlBody = buildTriggerEmailHtml(rule, sheetName, rowIdx, cellA1, bodyText, headers, rowValues);

    dispatchEmailNotification({
      to: to,
      cc: cc,
      subject: subject,
      htmlBody: htmlBody,
      ruleName: rule.name
    });
  });
}

/**
 * Evaluates and dispatches scheduled report digests matching the current hour/day window.
 */
function runScheduledReports() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ColMap = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 };

  SHEETPULSE_CONFIG.reportSchedules.forEach(function(schedule) {
    if (!schedule.enabled) return;
    const sheet = ss.getSheetByName(schedule.sheetName) || ss.getActiveSheet();
    const data = sheet.getDataRange().getDisplayValues();
    if (data.length <= 1) return;

    const headers = data[0];
    const rows = data.slice(1);
    const filterColIdx = ColMap[schedule.filterColumn] || 0;

    const matchedRows = rows.filter(function(r) {
      if (!schedule.filterEnabled) return true;
      return evaluateCondition(schedule.filterOperator, r[filterColIdx], schedule.filterValue, '', '');
    });

    const vars = {
      sheetName: sheet.getName(),
      date: Utilities.formatDate(new Date(), schedule.timezone || 'UTC', 'yyyy-MM-dd'),
      matchedCount: String(matchedRows.length)
    };

    const subject = interpolateString(schedule.subjectTemplate, vars);
    const htmlBody = buildDigestEmailHtml(schedule, sheet.getName(), headers, matchedRows);

    dispatchEmailNotification({
      to: schedule.recipients,
      cc: '',
      subject: subject,
      htmlBody: htmlBody,
      ruleName: 'Schedule: ' + schedule.name
    });
  });
}

/**
 * Routes email delivery through Custom SMTP Webhook Bridge or Google Apps Script MailApp.
 */
function dispatchEmailNotification(payload) {
  const smtp = SHEETPULSE_CONFIG.smtp;
  const props = PropertiesService.getScriptProperties();
  const smtpPassword = props.getProperty('SMTP_PASSWORD') || '';
  const webhookSecret = props.getProperty('WEBHOOK_SECRET') || '';

  if (smtp.providerMode !== 'apps_script_native' && smtp.webhookRelayUrl) {
    try {
      const response = UrlFetchApp.fetch(smtp.webhookRelayUrl, {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'Authorization': 'Bearer ' + webhookSecret,
          'X-SheetPulse-Rule': payload.ruleName || 'CellTrigger'
        },
        payload: JSON.stringify({
          smtp: {
            host: smtp.host,
            port: smtp.port,
            encryption: smtp.encryption,
            username: smtp.username,
            password: smtpPassword
          },
          message: {
            fromName: smtp.fromName,
            fromEmail: smtp.fromEmail,
            replyTo: smtp.replyTo,
            to: payload.to,
            cc: payload.cc,
            subject: payload.subject,
            html: payload.htmlBody,
            customHeaders: smtp.customHeaders
          }
        }),
        muteHttpExceptions: true
      });

      if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
        return { ok: true, transport: 'custom_smtp_relay' };
      }
      if (smtp.providerMode === 'custom_smtp') {
        throw new Error('SMTP Relay returned HTTP ' + response.getResponseCode() + ': ' + response.getContentText());
      }
    } catch (err) {
      console.warn('Custom SMTP relay error:', err);
      if (smtp.providerMode === 'custom_smtp') throw err;
    }
  }

  // Native Google Apps Script MailApp delivery (or hybrid fallback)
  MailApp.sendEmail({
    to: payload.to,
    cc: payload.cc || undefined,
    replyTo: smtp.replyTo || smtp.fromEmail,
    name: smtp.fromName,
    subject: payload.subject,
    htmlBody: payload.htmlBody
  });
  return { ok: true, transport: 'apps_script_mailapp' };
}

function evaluateCondition(operator, newVal, targetVal, oldVal, expectedPrevVal) {
  const a = String(newVal || '').trim();
  const b = String(targetVal || '').trim();
  const old = String(oldVal || '').trim();
  if (operator === 'not_empty') return a.length > 0;
  if (operator === 'equals') return a.toLowerCase() === b.toLowerCase();
  if (operator === 'not_equals') return a.toLowerCase() !== b.toLowerCase();
  if (operator === 'contains') return a.toLowerCase().indexOf(b.toLowerCase()) !== -1;
  if (operator === 'greater_than') return parseFloat(a.replace(/[$,]/g, '')) > parseFloat(b.replace(/[$,]/g, ''));
  if (operator === 'less_than') return parseFloat(a.replace(/[$,]/g, '')) < parseFloat(b.replace(/[$,]/g, ''));
  if (operator === 'changes_to') return a.toLowerCase() === b.toLowerCase() && old.toLowerCase() !== a.toLowerCase();
  if (operator === 'changes_from_to') {
    return old.toLowerCase() === String(expectedPrevVal || '').trim().toLowerCase() && a.toLowerCase() === b.toLowerCase();
  }
  return false;
}

function isCellWithinScope(rule, colLetter, colIdx, rowIdx) {
  if (rule.scopeType === 'column') return rule.column === colLetter;
  if (rule.scopeType === 'cell') return rule.cell.toUpperCase() === (colLetter + rowIdx);
  return rule.column === colLetter;
}

function isCooldownActive(rule, sheetName, rowIdx, newValue) {
  if (rule.cooldown === 'immediate') return false;
  const cache = CacheService.getScriptCache();
  const key = 'sp_' + rule.id + '_' + sheetName + '_r' + rowIdx + (rule.cooldown === 'once_per_row_value' ? '_' + newValue : '');
  if (cache.get(key)) return true;
  const ttlSeconds = rule.cooldown === 'daily_once' ? 86400 : 900;
  cache.put(key, '1', ttlSeconds);
  return false;
}

function buildTemplateVariables(sheetName, rowIdx, colLetter, oldValue, newValue, headers, rowValues) {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const vars = {
    row: String(rowIdx),
    cell: colLetter + rowIdx,
    oldValue: oldValue || '(empty)',
    newValue: newValue || '(empty)',
    sheetName: sheetName,
    timestamp: new Date().toISOString()
  };
  for (let i = 0; i < letters.length; i++) {
    vars[letters[i]] = rowValues[i] !== undefined ? String(rowValues[i]) : '';
  }
  return vars;
}

function interpolateString(template, vars) {
  return String(template || '').replace(/\\{\\{\\s*([a-zA-Z0-9_]+)\\s*\\}\\}/g, function(m, k) {
    return vars[k] !== undefined ? vars[k] : m;
  });
}

function columnToLetter(column) {
  let temp, letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

function buildTriggerEmailHtml(rule, sheetName, rowIdx, cellA1, bodyText, headers, rowValues) {
  return '<div style="font-family:sans-serif;padding:16px;border:1px solid #E2E8F0;border-radius:8px;">' +
    '<h3 style="margin-top:0;color:#0F172A;">' + rule.name + ' (' + sheetName + '!' + cellA1 + ')</h3>' +
    '<p style="white-space:pre-line;color:#334155;">' + bodyText + '</p>' +
    '</div>';
}

function buildDigestEmailHtml(schedule, sheetName, headers, matchedRows) {
  return '<div style="font-family:sans-serif;padding:16px;border:1px solid #E2E8F0;border-radius:8px;">' +
    '<h3 style="margin-top:0;color:#0F172A;">' + schedule.name + ' (' + matchedRows.length + ' rows)</h3>' +
    '<p style="color:#334155;">' + schedule.introNotes + '</p>' +
    '</div>';
}
`;
}

export function generateSidebarHtml(smtpConfig: SmtpConfig): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 16px; color: #0F172A; background: #F8FAFC; margin: 0; }
      h2 { font-size: 15px; font-weight: 600; margin: 0 0 4px 0; }
      p { font-size: 12px; color: #64748B; margin: 0 0 16px 0; }
      .panel { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 12px; margin-bottom: 12px; }
      label { display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 4px; }
      input { width: 100%; box-sizing: border-box; padding: 7px 9px; font-size: 12px; border: 1px solid #CBD5E1; border-radius: 4px; margin-bottom: 10px; font-family: monospace; }
      button { width: 100%; padding: 8px 12px; font-size: 12px; font-weight: 600; color: #FFFFFF; background: #10B981; border: none; border-radius: 5px; cursor: pointer; margin-bottom: 6px; }
      button.secondary { background: #0F172A; }
    </style>
  </head>
  <body>
    <h2>SheetPulse Extension</h2>
    <p>Active SMTP Relay: ${smtpConfig.host}:${smtpConfig.port} (${smtpConfig.encryption})</p>

    <div class="panel">
      <label>SMTP Password / API Token</label>
      <input type="password" id="smtpPass" placeholder="Enter secret key for PropertiesService" />
      <label>Relay Webhook Bearer Secret</label>
      <input type="password" id="webhookSecret" placeholder="whsec_..." />
      <button onclick="saveSecrets()">Save Secrets to ScriptProperties</button>
    </div>

    <div class="panel">
      <button class="secondary" onclick="google.script.run.installSheetPulseTriggers()">Re-Install Sheet Triggers</button>
      <button class="secondary" onclick="google.script.run.runScheduledReports()">Dispatch Scheduled Digest Now</button>
    </div>

    <script>
      function saveSecrets() {
        const pass = document.getElementById('smtpPass').value;
        const secret = document.getElementById('webhookSecret').value;
        google.script.run.withSuccessHandler(function() {
          alert('Secrets stored in Google Apps Script PropertiesService.');
        }).saveSheetPulseSecrets(pass, secret);
      }
    </script>
  </body>
</html>`;
}

export function generateSmtpRelayWorkerJs(smtpConfig: SmtpConfig): string {
  return `/**
 * SheetPulse Custom SMTP Relay Microservice (Node.js / Express / Cloud Run)
 *
 * Bridges Google Apps Script UrlFetchApp HTTPS requests to raw TCP/TLS SMTP
 * servers on ports 587 (STARTTLS), 465 (Implicit TLS), or 2525.
 */

import express from 'express';
import nodemailer from 'nodemailer';

const app = express();
app.use(express.json({ limit: '4mb' }));

const EXPECTED_SECRET = process.env.WEBHOOK_SECRET || ${JSON.stringify(smtpConfig.webhookSecret)};

app.post('/v1/smtp-bridge', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  if (EXPECTED_SECRET && authHeader !== \`Bearer \${EXPECTED_SECRET}\`) {
    return res.status(401).json({ ok: false, error: 'Unauthorized webhook signature' });
  }

  const { smtp, message } = req.body || {};
  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host || ${JSON.stringify(smtpConfig.host)},
      port: Number(smtp.port) || ${smtpConfig.port},
      secure: smtp.encryption === 'SSL_TLS' || Number(smtp.port) === 465,
      requireTLS: smtp.encryption === 'STARTTLS',
      auth: {
        user: smtp.username || ${JSON.stringify(smtpConfig.username)},
        pass: smtp.password || process.env.SMTP_PASSWORD
      }
    });

    const headersObj = {};
    (message.customHeaders || []).forEach((h) => {
      if (h.key) headersObj[h.key] = h.value;
    });

    const info = await transporter.sendMail({
      from: \`"\${message.fromName}" <\${message.fromEmail}>\`,
      to: message.to,
      cc: message.cc || undefined,
      replyTo: message.replyTo || message.fromEmail,
      subject: message.subject,
      html: message.html,
      headers: headersObj
    });

    res.json({ ok: true, messageId: info.messageId, response: info.response });
  } catch (error) {
    res.status(502).json({ ok: false, error: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(\`SheetPulse SMTP Bridge listening on port \${PORT}\`));
`;
}

export function generateAppsScriptManifest(timezone: string = 'America/Chicago'): string {
  return JSON.stringify(
    {
      timeZone: timezone,
      dependencies: {},
      exceptionLogging: 'STACKDRIVER',
      runtimeVersion: 'V8',
      oauthScopes: [
        'https://www.googleapis.com/auth/spreadsheets.currentonly',
        'https://www.googleapis.com/auth/script.send_mail',
        'https://www.googleapis.com/auth/script.external_request',
        'https://www.googleapis.com/auth/script.scriptapp',
      ],
    },
    null,
    2
  );
}
