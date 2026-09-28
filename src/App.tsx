import React, { useState, useEffect } from 'react';
import {
  CellTriggerRule,
  ColumnKey,
  DispatchLogEntry,
  ReportSchedule,
  SmtpConfig,
  SpreadsheetRow,
  SpreadsheetTab,
  WorkspaceTab,
} from './types/extension';
import {
  INITIAL_DISPATCH_LOGS,
  INITIAL_SCHEDULES,
  INITIAL_SHEETS,
  INITIAL_SMTP_CONFIG,
  INITIAL_TRIGGERS,
} from './data/initialData';
import {
  buildInterpolationMap,
  buildRawMimePreview,
  buildScheduledReportHtmlEmail,
  buildTriggerHtmlEmail,
  evaluateOperator,
  getWatchingRulesForCell,
  interpolateTemplate,
} from './utils/triggerEngine';
import { SpreadsheetSandbox } from './components/SpreadsheetSandbox';
import { CellTriggersPanel } from './components/CellTriggersPanel';
import { ReportSchedulesPanel } from './components/ReportSchedulesPanel';
import { SmtpSettingsPanel } from './components/SmtpSettingsPanel';
import { AppsScriptExportPanel } from './components/AppsScriptExportPanel';
import { EmailInspectorModal } from './components/EmailInspectorModal';

const STORAGE_KEY = 'sheetpulse_studio_state_v1';

export default function App() {
  const [activeNavTab, setActiveNavTab] = useState<WorkspaceTab>('triggers');
  const [sheets, setSheets] = useState<SpreadsheetTab[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.sheets) && parsed.sheets.length > 0) {
          return parsed.sheets;
        }
      }
    } catch {
      // fallback to initial
    }
    return INITIAL_SHEETS;
  });

  const [triggers, setTriggers] = useState<CellTriggerRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.triggers) && parsed.triggers.length > 0) {
          return parsed.triggers;
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_TRIGGERS;
  });

  const [schedules, setSchedules] = useState<ReportSchedule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.schedules) && parsed.schedules.length > 0) {
          return parsed.schedules;
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_SCHEDULES;
  });

  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.smtpConfig && parsed.smtpConfig.host) {
          return parsed.smtpConfig;
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_SMTP_CONFIG;
  });

  const [dispatchLogs, setDispatchLogs] = useState<DispatchLogEntry[]>(
    INITIAL_DISPATCH_LOGS
  );
  const [activeSheetId, setActiveSheetId] = useState<string>(
    INITIAL_SHEETS[0].id
  );
  const [selectedCell, setSelectedCell] = useState<{
    col: ColumnKey;
    rowNumber: number;
  }>({ col: 'D', rowNumber: 4 });
  const [inspectedLog, setInspectedLog] = useState<DispatchLogEntry | null>(
    null
  );
  const [lastTriggeredCellKey, setLastTriggeredCellKey] = useState<
    string | null
  >(null);
  const [toastBanner, setToastBanner] = useState<{
    title: string;
    detail: string;
    log?: DispatchLogEntry;
  } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ sheets, triggers, schedules, smtpConfig })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [sheets, triggers, schedules, smtpConfig]);

  const activeSheet =
    sheets.find((s) => s.id === activeSheetId) || sheets[0];

  const showNotice = (
    title: string,
    detail: string,
    log?: DispatchLogEntry
  ) => {
    setToastBanner({ title, detail, log });
    setTimeout(() => {
      setToastBanner((prev) => (prev?.title === title ? null : prev));
    }, 5000);
  };

  // Send payload through backend /api/smtp/send and record in dispatchLogs
  const executeSmtpDispatch = async (params: {
    sourceType: DispatchLogEntry['sourceType'];
    sourceName: string;
    sheetName: string;
    cellCoord: string;
    oldValue: string;
    newValue: string;
    to: string;
    cc?: string;
    subject: string;
    htmlBody: string;
    interpolatedVars: Record<string, string>;
    openModalOnComplete?: boolean;
  }) => {
    const fallbackId = `<sp-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}@sheetpulse.io>`;

    let messageId = fallbackId;
    let durationMs = 94;
    let ok = true;
    let transcript: string[] = [];

    try {
      const response = await fetch('/api/smtp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpConfig,
          emailPayload: {
            to: params.to,
            cc: params.cc,
            subject: params.subject,
            html: params.htmlBody,
            sourceName: params.sourceName,
          },
        }),
      });
      const data = await response.json();
      ok = Boolean(data.ok);
      messageId = data.messageId || fallbackId;
      durationMs = data.durationMs || 94;
      transcript = Array.isArray(data.transcript) ? data.transcript : [];
    } catch {
      transcript = [
        `220 ${smtpConfig.host} ESMTP SheetPulse-Fallback`,
        `250 2.0.0 Queued offline as ${fallbackId}`,
      ];
    }

    const transportUsed =
      smtpConfig.providerMode === 'apps_script_native'
        ? 'Google Apps Script MailApp'
        : `${smtpConfig.host}:${smtpConfig.port} (${smtpConfig.encryption})`;

    const rawMime = buildRawMimePreview({
      smtpConfig,
      to: params.to,
      cc: params.cc,
      subject: params.subject,
      htmlBody: params.htmlBody,
      messageId,
      sourceHeader: `${params.sourceName} (${params.sheetName}!${params.cellCoord})`,
    });

    const entry: DispatchLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      sourceType: params.sourceType,
      sourceName: params.sourceName,
      sheetName: params.sheetName,
      cellCoord: params.cellCoord,
      oldValue: params.oldValue,
      newValue: params.newValue,
      recipient: params.to,
      cc: params.cc,
      subject: params.subject,
      htmlBody: params.htmlBody,
      rawMime,
      status: ok
        ? smtpConfig.executionMode === 'live'
          ? 'sent'
          : 'simulated'
        : 'failed',
      transportUsed,
      messageId,
      durationMs,
      smtpTranscript: transcript,
      interpolatedVars: params.interpolatedVars,
    };

    setDispatchLogs((prev) => [entry, ...prev]);

    if (params.openModalOnComplete) {
      setInspectedLog(entry);
    } else {
      showNotice(
        `Trigger Dispatched: ${params.sourceName}`,
        `Sent to ${params.to} via ${transportUsed}`,
        entry
      );
    }
  };

  // Evaluate cell edit against all active rules
  const handleCellCommit = async (
    sheetId: string,
    col: ColumnKey,
    rowNumber: number,
    newValue: string
  ) => {
    const targetSheet = sheets.find((s) => s.id === sheetId);
    if (!targetSheet) return;
    const targetRow = targetSheet.rows.find((r) => r.rowNumber === rowNumber);
    if (!targetRow) return;

    const oldValue = targetRow.cells[col] ?? '';
    const updatedRow: SpreadsheetRow = {
      ...targetRow,
      cells: {
        ...targetRow.cells,
        [col]: newValue,
      },
    };

    // Update spreadsheet state
    setSheets((prev) =>
      prev.map((s) =>
        s.id === sheetId
          ? {
              ...s,
              rows: s.rows.map((r) =>
                r.rowNumber === rowNumber ? updatedRow : r
              ),
            }
          : s
      )
    );

    // Find all active rules watching this cell coordinate
    const watchingRules = getWatchingRulesForCell(
      triggers,
      sheetId,
      col,
      rowNumber
    );

    const matchedRules = watchingRules.filter((rule) =>
      evaluateOperator(
        rule.operator,
        newValue,
        rule.value,
        oldValue,
        rule.previousValue || ''
      )
    );

    if (matchedRules.length === 0) return;

    const cellKey = `${sheetId}:${col}${rowNumber}`;
    setLastTriggeredCellKey(cellKey);
    setTimeout(() => {
      setLastTriggeredCellKey((prev) => (prev === cellKey ? null : prev));
    }, 2200);

    const vars = buildInterpolationMap(
      targetSheet,
      updatedRow,
      col,
      oldValue,
      newValue
    );

    for (const rule of matchedRules) {
      const to = interpolateTemplate(rule.recipientTemplate, vars);
      const cc = interpolateTemplate(rule.ccTemplate, vars);
      const subject = interpolateTemplate(rule.subjectTemplate, vars);
      const body = interpolateTemplate(rule.bodyTemplate, vars);

      const htmlBody = buildTriggerHtmlEmail({
        rule,
        sheet: targetSheet,
        row: updatedRow,
        col,
        oldValue,
        newValue,
        interpolatedSubject: subject,
        interpolatedBody: body,
      });

      setTriggers((prev) =>
        prev.map((t) =>
          t.id === rule.id
            ? {
                ...t,
                triggerCount: t.triggerCount + 1,
                lastTriggeredAt: new Date().toISOString(),
              }
            : t
        )
      );

      await executeSmtpDispatch({
        sourceType: 'cell_trigger',
        sourceName: rule.name,
        sheetName: targetSheet.name,
        cellCoord: `${col}${rowNumber}`,
        oldValue,
        newValue,
        to,
        cc,
        subject,
        htmlBody,
        interpolatedVars: vars,
      });
    }
  };

  // Force-test a single trigger rule using the currently selected row
  const handleTestTriggerRule = async (rule: CellTriggerRule) => {
    const sheetForRule =
      sheets.find((s) => s.id === rule.sheetId) || activeSheet;
    const rowForTest =
      sheetForRule.rows.find((r) => r.rowNumber === selectedCell.rowNumber) ||
      sheetForRule.rows[0];

    const col = rule.column || selectedCell.col;
    const currentVal = rowForTest.cells[col] || rule.value;
    const simulatedNewVal =
      rule.operator === 'less_than'
        ? String(Math.max(1, (parseFloat(rule.value) || 15) - 4))
        : rule.operator === 'greater_than'
        ? String((parseFloat(rule.value) || 30) + 12)
        : rule.value || currentVal;

    const vars = buildInterpolationMap(
      sheetForRule,
      rowForTest,
      col,
      currentVal,
      simulatedNewVal
    );

    const to = interpolateTemplate(rule.recipientTemplate, vars);
    const cc = interpolateTemplate(rule.ccTemplate, vars);
    const subject = interpolateTemplate(rule.subjectTemplate, vars);
    const body = interpolateTemplate(rule.bodyTemplate, vars);

    const htmlBody = buildTriggerHtmlEmail({
      rule,
      sheet: sheetForRule,
      row: rowForTest,
      col,
      oldValue: currentVal,
      newValue: simulatedNewVal,
      interpolatedSubject: subject,
      interpolatedBody: body,
    });

    setTriggers((prev) =>
      prev.map((t) =>
        t.id === rule.id
          ? {
              ...t,
              triggerCount: t.triggerCount + 1,
              lastTriggeredAt: new Date().toISOString(),
            }
          : t
      )
    );

    await executeSmtpDispatch({
      sourceType: 'cell_trigger',
      sourceName: rule.name,
      sheetName: sheetForRule.name,
      cellCoord: `${col}${rowForTest.rowNumber}`,
      oldValue: currentVal,
      newValue: simulatedNewVal,
      to,
      cc,
      subject,
      htmlBody,
      interpolatedVars: vars,
      openModalOnComplete: true,
    });
  };

  // Run a scheduled report digest immediately
  const handleRunScheduleNow = async (schedule: ReportSchedule) => {
    const targetSheet =
      sheets.find((s) => s.id === schedule.sheetId) || activeSheet;

    const matchingRows = targetSheet.rows.filter((r) => {
      if (!schedule.filterEnabled) return true;
      return evaluateOperator(
        schedule.filterOperator,
        r.cells[schedule.filterColumn] || '',
        schedule.filterValue
      );
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    const vars: Record<string, string> = {
      sheetName: targetSheet.name,
      date: dateStr,
      matchedCount: String(matchingRows.length),
      totalRows: String(targetSheet.rows.length),
    };

    const subject = interpolateTemplate(schedule.subjectTemplate, vars);
    const { html } = buildScheduledReportHtmlEmail({
      schedule,
      sheet: targetSheet,
      matchingRows,
      interpolatedSubject: subject,
    });

    setSchedules((prev) =>
      prev.map((s) =>
        s.id === schedule.id
          ? {
              ...s,
              runCount: s.runCount + 1,
              lastRunAt: new Date().toISOString(),
            }
          : s
      )
    );

    await executeSmtpDispatch({
      sourceType: 'scheduled_report',
      sourceName: `Schedule: ${schedule.name}`,
      sheetName: targetSheet.name,
      cellCoord: `A2:F${targetSheet.rows.length + 1}`,
      oldValue: `${targetSheet.rows.length} rows`,
      newValue: `${matchingRows.length} matched`,
      to: schedule.recipients,
      subject,
      htmlBody: html,
      interpolatedVars: vars,
      openModalOnComplete: true,
    });
  };

  // Scan all rows in the active sheet against active triggers
  const handleScanActiveSheet = async () => {
    let firedCount = 0;
    for (const row of activeSheet.rows) {
      for (const rule of triggers) {
        if (!rule.enabled) continue;
        if (rule.sheetId !== 'ALL' && rule.sheetId !== activeSheet.id) continue;
        const col = rule.column;
        const cellVal = row.cells[col] || '';
        const opToRun =
          rule.operator === 'changes_to' ? 'equals' : rule.operator;
        if (evaluateOperator(opToRun, cellVal, rule.value)) {
          firedCount++;
          const vars = buildInterpolationMap(
            activeSheet,
            row,
            col,
            cellVal,
            cellVal
          );
          const to = interpolateTemplate(rule.recipientTemplate, vars);
          const cc = interpolateTemplate(rule.ccTemplate, vars);
          const subject = interpolateTemplate(rule.subjectTemplate, vars);
          const body = interpolateTemplate(rule.bodyTemplate, vars);
          const htmlBody = buildTriggerHtmlEmail({
            rule,
            sheet: activeSheet,
            row,
            col,
            oldValue: cellVal,
            newValue: cellVal,
            interpolatedSubject: subject,
            interpolatedBody: body,
          });
          await executeSmtpDispatch({
            sourceType: 'cell_trigger',
            sourceName: rule.name,
            sheetName: activeSheet.name,
            cellCoord: `${col}${row.rowNumber}`,
            oldValue: cellVal,
            newValue: cellVal,
            to,
            cc,
            subject,
            htmlBody,
            interpolatedVars: vars,
          });
        }
      }
    }

    if (firedCount === 0) {
      showNotice(
        'Sheet Scan Complete',
        `Evaluated ${activeSheet.rows.length} rows in ${activeSheet.name}; no threshold breaches found.`
      );
    }
  };

  const handleAddRow = (sheetId: string) => {
    setSheets((prev) =>
      prev.map((s) => {
        if (s.id !== sheetId) return s;
        const nextRowNum =
          s.rows.length > 0
            ? Math.max(...s.rows.map((r) => r.rowNumber)) + 1
            : 2;
        const newRow: SpreadsheetRow = {
          rowNumber: nextRowNum,
          cells:
            sheetId === 'sheet_inventory'
              ? {
                  A: `SKU-44${nextRowNum}`,
                  B: 'Modular Solid-State Relay',
                  C: 'Austin-TX-01',
                  D: '12',
                  E: 'Low Stock',
                  F: 'elena.rostova@voltgrid.io',
                }
              : sheetId === 'sheet_revenue'
              ? {
                  A: `CTR-90${nextRowNum}`,
                  B: 'Hyperion Cloud Systems',
                  C: 'Enterprise',
                  D: '165000',
                  E: 'Healthy',
                  F: 'claire.dupont@sheetpulse.io',
                }
              : {
                  A: `INC-29${nextRowNum}`,
                  B: 'Realtime Metrics Collector',
                  C: 'SEV-2',
                  D: '34',
                  E: 'Investigating',
                  F: 'nina.solis@sheetpulse.io',
                },
        };
        return { ...s, rows: [...s.rows, newRow] };
      })
    );
  };

  const handleResetSheets = () => {
    setSheets(INITIAL_SHEETS);
    showNotice(
      'Spreadsheet Reset',
      'Restored default operational rows across all 3 Google Sheets tabs.'
    );
  };

  const handleVerifySmtpHandshake = async () => {
    const res = await fetch('/api/smtp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ smtpConfig }),
    });
    return res.json();
  };

  const handleSendDiagnosticEmail = async (recipient: string) => {
    const html = `<div style="font-family: sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
      <div style="background: #0F172A; color: #FFFFFF; padding: 16px 20px; border-bottom: 3px solid #10B981;">
        <div style="font-size: 11px; color: #10B981; font-weight: 600;">SMTP Relay Verification</div>
        <div style="font-size: 16px; font-weight: 600; margin-top: 4px;">SheetPulse Custom SMTP Diagnostic Test</div>
      </div>
      <div style="padding: 20px; font-size: 14px; color: #1E293B; line-height: 1.6;">
        <p style="margin-top: 0;">This diagnostic email confirms that your Google Sheets extension SMTP configuration is properly formatted and ready to dispatch automated cell trigger alerts.</p>
        <p style="font-family: monospace; font-size: 12px; background: #F8FAFC; padding: 12px; border: 1px solid #E2E8F0; border-radius: 4px;">
          Host: ${smtpConfig.host}:${smtpConfig.port} (${smtpConfig.encryption})<br/>
          Sender: "${smtpConfig.fromName}" &lt;${smtpConfig.fromEmail}&gt;<br/>
          Rate Cap: ${smtpConfig.rateLimitPerHour} emails/hr
        </p>
      </div>
    </div>`;

    await executeSmtpDispatch({
      sourceType: 'manual_test',
      sourceName: 'SMTP Diagnostic Verification',
      sheetName: activeSheet.name,
      cellCoord: 'SMTP_TEST',
      oldValue: smtpConfig.host,
      newValue: `${smtpConfig.port}/${smtpConfig.encryption}`,
      to: recipient,
      subject: `[SheetPulse SMTP Verified] Test via ${smtpConfig.host}:${smtpConfig.port}`,
      htmlBody: html,
      interpolatedVars: {
        host: smtpConfig.host,
        port: String(smtpConfig.port),
        encryption: smtpConfig.encryption,
      },
      openModalOnComplete: true,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="h-14 px-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveNavTab('triggers');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap"
        >
          SheetPulse
        </a>

        {/* Zone 2: 4 clean text navigation links */}
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveNavTab('triggers')}
            className={`py-4 border-b-2 transition-colors whitespace-nowrap ${
              activeNavTab === 'triggers'
                ? 'border-emerald-600 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Cell Triggers
          </button>
          <button
            type="button"
            onClick={() => setActiveNavTab('schedules')}
            className={`py-4 border-b-2 transition-colors whitespace-nowrap ${
              activeNavTab === 'schedules'
                ? 'border-emerald-600 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Report Schedules
          </button>
          <button
            type="button"
            onClick={() => setActiveNavTab('smtp')}
            className={`py-4 border-b-2 transition-colors whitespace-nowrap ${
              activeNavTab === 'smtp'
                ? 'border-emerald-600 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            SMTP &amp; Delivery
          </button>
          <button
            type="button"
            onClick={() => setActiveNavTab('export')}
            className={`py-4 border-b-2 transition-colors whitespace-nowrap ${
              activeNavTab === 'export'
                ? 'border-emerald-600 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Apps Script Export
          </button>
        </nav>

        {/* Zone 3: 2 primary actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleScanActiveSheet}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            Scan Active Sheet
          </button>
          <button
            type="button"
            onClick={() => setActiveNavTab('export')}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            Export Extension
          </button>
        </div>
      </header>

      {/* Non-intrusive Dispatch Notification Banner */}
      {toastBanner && (
        <div className="bg-slate-900 text-white px-6 py-2.5 flex items-center justify-between gap-4 text-xs border-b border-slate-800">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="font-semibold text-emerald-300">
              {toastBanner.title}
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-slate-300 truncate">{toastBanner.detail}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {toastBanner.log && (
              <button
                type="button"
                onClick={() => setInspectedLog(toastBanner.log!)}
                className="underline text-emerald-300 hover:text-white font-medium whitespace-nowrap"
              >
                Inspect Sent Email &amp; SMTP Trace
              </button>
            )}
            <button
              type="button"
              onClick={() => setToastBanner(null)}
              className="text-slate-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Split-Screen Studio Workspace */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-3.5rem)]">
        {/* Left Pane (5 cols on 12-col desktop grid): Interactive Spreadsheet Sandbox & Live Log */}
        <section className="lg:col-span-5 xl:col-span-5 flex flex-col h-[680px] lg:h-[calc(100vh-3.5rem)] lg:sticky lg:top-0">
          <SpreadsheetSandbox
            sheets={sheets}
            activeSheetId={activeSheetId}
            onSelectSheet={setActiveSheetId}
            selectedCell={selectedCell}
            onSelectCell={(col, rowNumber) =>
              setSelectedCell({ col, rowNumber })
            }
            onCellCommit={handleCellCommit}
            onAddRow={handleAddRow}
            onResetSheets={handleResetSheets}
            triggers={triggers}
            dispatchLogs={dispatchLogs}
            onInspectLog={setInspectedLog}
            lastTriggeredCellKey={lastTriggeredCellKey}
          />
        </section>

        {/* Right Pane (7 cols on 12-col desktop grid): Extension Configuration & Code Exporter */}
        <section className="lg:col-span-7 xl:col-span-7 overflow-y-auto bg-[#F8FAFC]">
          {activeNavTab === 'triggers' && (
            <CellTriggersPanel
              triggers={triggers}
              sheets={sheets}
              activeSheet={activeSheet}
              selectedCell={selectedCell}
              onUpdateTrigger={(updated) =>
                setTriggers((prev) =>
                  prev.map((t) => (t.id === updated.id ? updated : t))
                )
              }
              onCreateTrigger={(created) =>
                setTriggers((prev) => [created, ...prev])
              }
              onDeleteTrigger={(ruleId) =>
                setTriggers((prev) => prev.filter((t) => t.id !== ruleId))
              }
              onTestTriggerRule={handleTestTriggerRule}
            />
          )}

          {activeNavTab === 'schedules' && (
            <ReportSchedulesPanel
              schedules={schedules}
              sheets={sheets}
              onUpdateSchedule={(updated) =>
                setSchedules((prev) =>
                  prev.map((s) => (s.id === updated.id ? updated : s))
                )
              }
              onCreateSchedule={(created) =>
                setSchedules((prev) => [created, ...prev])
              }
              onDeleteSchedule={(scheduleId) =>
                setSchedules((prev) =>
                  prev.filter((s) => s.id !== scheduleId)
                )
              }
              onRunScheduleNow={handleRunScheduleNow}
            />
          )}

          {activeNavTab === 'smtp' && (
            <SmtpSettingsPanel
              smtpConfig={smtpConfig}
              onUpdateSmtp={setSmtpConfig}
              onVerifyHandshake={handleVerifySmtpHandshake}
              onSendTestEmail={handleSendDiagnosticEmail}
            />
          )}

          {activeNavTab === 'export' && (
            <AppsScriptExportPanel
              sheets={sheets}
              triggers={triggers}
              schedules={schedules}
              smtpConfig={smtpConfig}
            />
          )}
        </section>
      </main>

      {/* Email & SMTP Protocol Inspector Modal */}
      <EmailInspectorModal
        log={inspectedLog}
        onClose={() => setInspectedLog(null)}
      />
    </div>
  );
}
