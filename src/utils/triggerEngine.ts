import {
  COLUMN_KEYS,
  CellTriggerRule,
  ColumnKey,
  ReportSchedule,
  SmtpConfig,
  SpreadsheetRow,
  SpreadsheetTab,
  TriggerOperator,
} from '../types/extension';

const COL_INDEX_MAP: Record<ColumnKey, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
  F: 5,
};

export function parseA1Range(rangeStr: string): {
  startCol: number;
  endCol: number;
  startRow: number;
  endRow: number;
} | null {
  const cleaned = rangeStr.trim().toUpperCase();
  const match = cleaned.match(/^([A-F])(\d+)(?::([A-F])(\d+))?$/);
  if (!match) return null;

  const col1 = COL_INDEX_MAP[match[1] as ColumnKey];
  const row1 = parseInt(match[2], 10);
  const col2 = match[3] ? COL_INDEX_MAP[match[3] as ColumnKey] : col1;
  const row2 = match[4] ? parseInt(match[4], 10) : row1;

  return {
    startCol: Math.min(col1, col2),
    endCol: Math.max(col1, col2),
    startRow: Math.min(row1, row2),
    endRow: Math.max(row1, row2),
  };
}

export function isCellInRuleScope(
  rule: CellTriggerRule,
  sheetId: string,
  col: ColumnKey,
  rowNumber: number
): boolean {
  if (rule.sheetId !== 'ALL' && rule.sheetId !== sheetId) {
    return false;
  }

  if (rule.scopeType === 'column') {
    return rule.column === col;
  }

  if (rule.scopeType === 'cell') {
    const target = rule.cell.trim().toUpperCase();
    return target === `${col}${rowNumber}`;
  }

  if (rule.scopeType === 'range') {
    const bounds = parseA1Range(rule.range);
    if (!bounds) {
      return rule.column === col;
    }
    const colIdx = COL_INDEX_MAP[col];
    return (
      colIdx >= bounds.startCol &&
      colIdx <= bounds.endCol &&
      rowNumber >= bounds.startRow &&
      rowNumber <= bounds.endRow
    );
  }

  return false;
}

export function getWatchingRulesForCell(
  rules: CellTriggerRule[],
  sheetId: string,
  col: ColumnKey,
  rowNumber: number
): CellTriggerRule[] {
  return rules.filter(
    (r) => r.enabled && isCellInRuleScope(r, sheetId, col, rowNumber)
  );
}

export function evaluateOperator(
  operator: TriggerOperator,
  newValue: string,
  targetValue: string,
  oldValue: string = '',
  expectedPreviousValue: string = ''
): boolean {
  const cleanNew = String(newValue ?? '').trim();
  const cleanTarget = String(targetValue ?? '').trim();
  const cleanOld = String(oldValue ?? '').trim();
  const cleanExpectedPrev = String(expectedPreviousValue ?? '').trim();

  switch (operator) {
    case 'not_empty':
      return cleanNew.length > 0;

    case 'equals':
      return cleanNew.toLowerCase() === cleanTarget.toLowerCase();

    case 'not_equals':
      return cleanNew.toLowerCase() !== cleanTarget.toLowerCase();

    case 'contains':
      return cleanNew.toLowerCase().includes(cleanTarget.toLowerCase());

    case 'greater_than': {
      const numNew = parseFloat(cleanNew.replace(/[$,\s]/g, ''));
      const numTarget = parseFloat(cleanTarget.replace(/[$,\s]/g, ''));
      if (Number.isNaN(numNew) || Number.isNaN(numTarget)) return false;
      return numNew > numTarget;
    }

    case 'less_than': {
      const numNew = parseFloat(cleanNew.replace(/[$,\s]/g, ''));
      const numTarget = parseFloat(cleanTarget.replace(/[$,\s]/g, ''));
      if (Number.isNaN(numNew) || Number.isNaN(numTarget)) return false;
      return numNew < numTarget;
    }

    case 'changes_to':
      return (
        cleanNew.toLowerCase() === cleanTarget.toLowerCase() &&
        cleanOld.toLowerCase() !== cleanNew.toLowerCase()
      );

    case 'changes_from_to':
      return (
        cleanOld.toLowerCase() === cleanExpectedPrev.toLowerCase() &&
        cleanNew.toLowerCase() === cleanTarget.toLowerCase()
      );

    default:
      return false;
  }
}

export function buildInterpolationMap(
  sheet: SpreadsheetTab,
  row: SpreadsheetRow,
  col: ColumnKey,
  oldValue: string,
  newValue: string
): Record<string, string> {
  const nowIso = new Date().toISOString();
  const dateStr = nowIso.slice(0, 10);

  const vars: Record<string, string> = {
    A: row.cells.A || '',
    B: row.cells.B || '',
    C: row.cells.C || '',
    D: row.cells.D || '',
    E: row.cells.E || '',
    F: row.cells.F || '',
    headerA: sheet.headers.A,
    headerB: sheet.headers.B,
    headerC: sheet.headers.C,
    headerD: sheet.headers.D,
    headerE: sheet.headers.E,
    headerF: sheet.headers.F,
    row: String(row.rowNumber),
    cell: `${col}${row.rowNumber}`,
    column: col,
    oldValue: oldValue || '(empty)',
    newValue: newValue || '(empty)',
    sheetName: sheet.name,
    date: dateStr,
    timestamp: nowIso,
  };

  return vars;
}

export function interpolateTemplate(
  template: string,
  vars: Record<string, string>
): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match;
  });
}

export function buildTriggerHtmlEmail(params: {
  rule: CellTriggerRule;
  sheet: SpreadsheetTab;
  row: SpreadsheetRow;
  col: ColumnKey;
  oldValue: string;
  newValue: string;
  interpolatedSubject: string;
  interpolatedBody: string;
}): string {
  const {
    rule,
    sheet,
    row,
    col,
    oldValue,
    newValue,
    interpolatedSubject,
    interpolatedBody,
  } = params;

  const paragraphsHtml = interpolatedBody
    .split('\n')
    .map((line) =>
      line.trim().length === 0
        ? '<div style="height: 10px;"></div>'
        : `<p style="margin: 0 0 8px 0; color: #1E293B; font-size: 14px; line-height: 1.6;">${escapeHtml(line)}</p>`
    )
    .join('');

  const snapshotTable = rule.includeRowSnapshot
    ? `
    <div style="margin-top: 20px; border-top: 1px solid #E2E8F0; padding-top: 16px;">
      <div style="font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
        Row ${row.rowNumber} Snapshot · ${escapeHtml(sheet.name)} (Triggered on ${col}${row.rowNumber})
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #E2E8F0;">
        <thead>
          <tr style="background: #F8FAFC; border-bottom: 1px solid #E2E8F0;">
            ${COLUMN_KEYS.map(
              (k) =>
                `<th style="text-align: left; padding: 8px 10px; color: #475569; font-weight: 600; border-right: 1px solid #E2E8F0;">${k} · ${escapeHtml(sheet.headers[k])}</th>`
            ).join('')}
          </tr>
        </thead>
        <tbody>
          <tr>
            ${COLUMN_KEYS.map((k) => {
              const isTriggeredCol = k === col;
              return `<td style="padding: 9px 10px; border-right: 1px solid #E2E8F0; font-family: ui-monospace, SFMono-Regular, monospace; ${
                isTriggeredCol
                  ? 'background: #ECFDF5; color: #065F46; font-weight: 700;'
                  : 'color: #0F172A;'
              }">
                ${escapeHtml(row.cells[k] || '')}
                ${
                  isTriggeredCol && oldValue !== newValue
                    ? `<span style="display: block; font-size: 10px; color: #64748B; font-weight: 400;">was: ${escapeHtml(oldValue)}</span>`
                    : ''
                }
              </td>`;
            }).join('')}
          </tr>
        </tbody>
      </table>
    </div>`
    : '';

  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0F172A; max-width: 660px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; background: #FFFFFF;">
  <div style="background: #0F172A; color: #FFFFFF; padding: 16px 20px; border-bottom: 3px solid ${
    rule.priority === 'high' ? '#10B981' : '#4F46E5'
  };">
    <div style="font-size: 11px; color: #10B981; letter-spacing: 0.04em; font-weight: 600;">
      SheetPulse Trigger · ${escapeHtml(rule.name)} · Priority: ${rule.priority.toUpperCase()}
    </div>
    <div style="font-size: 16px; font-weight: 600; margin-top: 4px; color: #F8FAFC;">
      ${escapeHtml(interpolatedSubject)}
    </div>
  </div>
  <div style="padding: 20px;">
    ${paragraphsHtml}
    ${snapshotTable}
  </div>
  <div style="background: #F8FAFC; padding: 12px 20px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #64748B;">
    Dispatched automatically by SheetPulse Google Sheets Extension · Cell ${escapeHtml(sheet.name)}!${col}${row.rowNumber}
  </div>
</div>`;
}

export function buildScheduledReportHtmlEmail(params: {
  schedule: ReportSchedule;
  sheet: SpreadsheetTab;
  matchingRows: SpreadsheetRow[];
  interpolatedSubject: string;
}): { html: string; csvPreview: string } {
  const { schedule, sheet, matchingRows, interpolatedSubject } = params;

  const numCol = schedule.summaryNumericColumn || 'D';
  const numericValues = matchingRows
    .map((r) => parseFloat(String(r.cells[numCol] || '').replace(/[$,\s]/g, '')))
    .filter((n) => !Number.isNaN(n));

  const sumVal = numericValues.reduce((acc, v) => acc + v, 0);
  const avgVal = numericValues.length > 0 ? sumVal / numericValues.length : 0;

  const kpiBlock = schedule.includeSummaryKpis
    ? `<div style="display: flex; gap: 16px; margin: 16px 0; padding: 14px 16px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px;">
        <div style="flex: 1;">
          <div style="font-size: 11px; color: #64748B;">Matched Rows</div>
          <div style="font-size: 18px; font-weight: 700; font-family: monospace; color: #0F172A;">${matchingRows.length} / ${sheet.rows.length}</div>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 11px; color: #64748B;">Sum (${escapeHtml(sheet.headers[numCol])})</div>
          <div style="font-size: 18px; font-weight: 700; font-family: monospace; color: #0F172A;">${sumVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 11px; color: #64748B;">Average (${escapeHtml(sheet.headers[numCol])})</div>
          <div style="font-size: 18px; font-weight: 700; font-family: monospace; color: #0F172A;">${avgVal.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
        </div>
      </div>`
    : '';

  const rowsHtml =
    matchingRows.length === 0
      ? `<tr><td colspan="6" style="padding: 16px; text-align: center; color: #64748B;">No rows matched the report filter criteria at execution time.</td></tr>`
      : matchingRows
          .map(
            (r) => `<tr style="border-bottom: 1px solid #E2E8F0;">
              <td style="padding: 8px 10px; font-family: monospace; color: #64748B;">#${r.rowNumber}</td>
              ${COLUMN_KEYS.map(
                (k) =>
                  `<td style="padding: 8px 10px; ${
                    sheet.columnTypes[k] === 'number'
                      ? 'text-align: right; font-family: monospace; font-weight: 600;'
                      : ''
                  }">${escapeHtml(r.cells[k] || '')}</td>`
              ).join('')}
            </tr>`
          )
          .join('');

  const csvLines = [
    ['Row', ...COLUMN_KEYS.map((k) => `"${sheet.headers[k]}"`)].join(','),
    ...matchingRows.map((r) =>
      [r.rowNumber, ...COLUMN_KEYS.map((k) => `"${(r.cells[k] || '').replace(/"/g, '""')}"`)].join(',')
    ),
  ];
  const csvPreview = csvLines.join('\n');

  const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0F172A; max-width: 680px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; background: #FFFFFF;">
  <div style="background: #0F172A; color: #FFFFFF; padding: 16px 20px; border-bottom: 3px solid #4F46E5;">
    <div style="font-size: 11px; color: #A5B4FC; letter-spacing: 0.04em; font-weight: 600;">
      Scheduled Report Digest · ${escapeHtml(schedule.cadence.toUpperCase())} · ${escapeHtml(schedule.timezone)}
    </div>
    <div style="font-size: 16px; font-weight: 600; margin-top: 4px; color: #F8FAFC;">
      ${escapeHtml(interpolatedSubject)}
    </div>
  </div>
  <div style="padding: 20px;">
    <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #334155;">
      ${escapeHtml(schedule.introNotes)}
    </p>
    ${kpiBlock}
    <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #E2E8F0; margin-top: 12px;">
      <thead>
        <tr style="background: #F1F5F9; border-bottom: 1px solid #E2E8F0;">
          <th style="text-align: left; padding: 8px 10px; color: #475569;">Row</th>
          ${COLUMN_KEYS.map(
            (k) =>
              `<th style="text-align: ${
                sheet.columnTypes[k] === 'number' ? 'right' : 'left'
              }; padding: 8px 10px; color: #475569;">${escapeHtml(sheet.headers[k])}</th>`
          ).join('')}
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
    ${
      schedule.format !== 'html_table'
        ? `<div style="margin-top: 16px; padding: 10px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; font-family: monospace; font-size: 11px; color: #475569;">
            Attached CSV Snapshot: ${escapeHtml(sheet.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'))}_digest.csv (${BufferLikeLength(csvPreview)} bytes)
          </div>`
        : ''
    }
  </div>
</div>`;

  return { html, csvPreview };
}

function BufferLikeLength(str: string): number {
  return new TextEncoder().encode(str).length;
}

export function buildRawMimePreview(params: {
  smtpConfig: SmtpConfig;
  to: string;
  cc?: string;
  subject: string;
  htmlBody: string;
  messageId: string;
  sourceHeader: string;
}): string {
  const { smtpConfig, to, cc, subject, htmlBody, messageId, sourceHeader } = params;
  const customHeaderLines = smtpConfig.customHeaders
    .filter((h) => h.key.trim().length > 0)
    .map((h) => `${h.key.trim()}: ${h.value.trim()}`)
    .join('\n');

  return [
    `From: "${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
    `To: ${to}`,
    cc ? `Cc: ${cc}` : null,
    smtpConfig.replyTo ? `Reply-To: ${smtpConfig.replyTo}` : null,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    `X-SheetPulse-Source: ${sourceHeader}`,
    customHeaderLines || null,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    htmlBody,
  ]
    .filter((line) => line !== null)
    .join('\n');
}

export function computeNextScheduleRuns(
  schedule: ReportSchedule,
  count: number = 5
): string[] {
  const results: string[] = [];
  const now = new Date();
  const [hourStr, minStr] = (schedule.timeOfDay || '08:00').split(':');
  const targetHour = Math.min(23, Math.max(0, parseInt(hourStr || '8', 10)));
  const targetMin = Math.min(59, Math.max(0, parseInt(minStr || '0', 10)));

  if (schedule.cadence === 'hourly') {
    const cursor = new Date(now);
    cursor.setMinutes(targetMin, 0, 0);
    if (cursor <= now) cursor.setHours(cursor.getHours() + 1);
    for (let i = 0; i < count; i++) {
      results.push(formatRunTimestamp(cursor, schedule.timezone));
      cursor.setHours(cursor.getHours() + 1);
    }
    return results;
  }

  if (schedule.cadence === 'cron') {
    // Parse basic step or hourly/daily cron preview
    const parts = schedule.cronExpression.trim().split(/\s+/);
    const stepHourMatch = parts[1]?.match(/^\*\/(\d+)$/);
    const stepHours = stepHourMatch ? Math.max(1, parseInt(stepHourMatch[1], 10)) : 2;
    const cursor = new Date(now);
    cursor.setMinutes(parseInt(parts[0], 10) || 0, 0, 0);
    if (cursor <= now) cursor.setHours(cursor.getHours() + stepHours);
    while (results.length < count) {
      results.push(formatRunTimestamp(cursor, schedule.timezone));
      cursor.setHours(cursor.getHours() + stepHours);
    }
    return results;
  }

  if (schedule.cadence === 'monthly') {
    const cursor = new Date(now);
    cursor.setDate(1);
    cursor.setHours(targetHour, targetMin, 0, 0);
    if (cursor <= now) {
      cursor.setMonth(cursor.getMonth() + 1);
    }
    for (let i = 0; i < count; i++) {
      results.push(formatRunTimestamp(cursor, schedule.timezone));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return results;
  }

  // Daily or Weekly respecting daysOfWeek
  const allowedDays =
    schedule.daysOfWeek && schedule.daysOfWeek.length > 0
      ? schedule.daysOfWeek
      : [1, 2, 3, 4, 5];

  const cursor = new Date(now);
  cursor.setHours(targetHour, targetMin, 0, 0);
  if (cursor <= now) {
    cursor.setDate(cursor.getDate() + 1);
  }

  let safety = 0;
  while (results.length < count && safety < 60) {
    safety++;
    if (
      schedule.cadence === 'daily' &&
      schedule.daysOfWeek.length === 0
    ) {
      results.push(formatRunTimestamp(cursor, schedule.timezone));
    } else if (allowedDays.includes(cursor.getDay())) {
      results.push(formatRunTimestamp(cursor, schedule.timezone));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return results;
}

function formatRunTimestamp(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return date.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  }
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
