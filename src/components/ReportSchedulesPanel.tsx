import React, { useState } from 'react';
import {
  COLUMN_KEYS,
  ColumnKey,
  ReportCadence,
  ReportFormat,
  ReportSchedule,
  SpreadsheetTab,
} from '../types/extension';
import { computeNextScheduleRuns } from '../utils/triggerEngine';
import { CalendarClock, Play, Plus, Trash2, Check } from 'lucide-react';

interface ReportSchedulesPanelProps {
  schedules: ReportSchedule[];
  sheets: SpreadsheetTab[];
  onUpdateSchedule: (updated: ReportSchedule) => void;
  onCreateSchedule: (newSchedule: ReportSchedule) => void;
  onDeleteSchedule: (scheduleId: string) => void;
  onRunScheduleNow: (schedule: ReportSchedule) => void;
}

const DAYS_OF_WEEK = [
  { day: 1, short: 'Mon' },
  { day: 2, short: 'Tue' },
  { day: 3, short: 'Wed' },
  { day: 4, short: 'Thu' },
  { day: 5, short: 'Fri' },
  { day: 6, short: 'Sat' },
  { day: 0, short: 'Sun' },
];

const TIMEZONES = [
  'America/Chicago',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Singapore',
];

export const ReportSchedulesPanel: React.FC<ReportSchedulesPanelProps> = ({
  schedules,
  sheets,
  onUpdateSchedule,
  onCreateSchedule,
  onDeleteSchedule,
  onRunScheduleNow,
}) => {
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(
    schedules[0]?.id || ''
  );
  const [dispatchedId, setDispatchedId] = useState<string | null>(null);

  const activeSchedule =
    schedules.find((s) => s.id === selectedScheduleId) || schedules[0];

  const targetSheet =
    sheets.find((s) => s.id === activeSchedule?.sheetId) || sheets[0];

  const handleAddSchedule = () => {
    const newId = `sch_${Date.now().toString(36)}`;
    const created: ReportSchedule = {
      id: newId,
      name: `${targetSheet.name} Automated Digest`,
      enabled: true,
      sheetId: targetSheet.id,
      filterEnabled: false,
      filterColumn: 'E',
      filterOperator: 'equals',
      filterValue: 'Critical',
      cadence: 'daily',
      cronExpression: '0 8 * * 1-5',
      daysOfWeek: [1, 2, 3, 4, 5],
      timeOfDay: '08:30',
      timezone: 'America/New_York',
      recipients: 'ops-team@voltgrid.io',
      subjectTemplate: `[Scheduled Digest] {{sheetName}} Rollup ({{date}})`,
      introNotes: `Automated scheduled report generated from ${targetSheet.name}.`,
      format: 'both',
      includeSummaryKpis: true,
      summaryNumericColumn: 'D',
      lastRunAt: null,
      runCount: 0,
    };
    onCreateSchedule(created);
    setSelectedScheduleId(newId);
  };

  const toggleDayOfWeek = (dayNum: number) => {
    if (!activeSchedule) return;
    const exists = activeSchedule.daysOfWeek.includes(dayNum);
    const updatedDays = exists
      ? activeSchedule.daysOfWeek.filter((d) => d !== dayNum)
      : [...activeSchedule.daysOfWeek, dayNum].sort();
    onUpdateSchedule({
      ...activeSchedule,
      daysOfWeek: updatedDays.length > 0 ? updatedDays : [dayNum],
    });
  };

  const nextRuns = activeSchedule
    ? computeNextScheduleRuns(activeSchedule, 5)
    : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            02. Flexible Report Scheduling &amp; Digests
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure time-driven Google Apps Script triggers, custom cron expressions, row filters, and multi-format CSV/HTML rollups.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddSchedule}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors whitespace-nowrap flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          New Report Schedule
        </button>
      </div>

      {/* Schedule List */}
      <div className="border border-slate-200 rounded-md bg-white divide-y divide-slate-200">
        {schedules.map((sch) => {
          const isSelected = sch.id === activeSchedule?.id;
          const sheetObj = sheets.find((s) => s.id === sch.sheetId);

          return (
            <div
              key={sch.id}
              onClick={() => setSelectedScheduleId(sch.id)}
              className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sch.enabled}
                    onChange={(e) => {
                      e.stopPropagation();
                      onUpdateSchedule({ ...sch, enabled: e.target.checked });
                    }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    aria-label={`Toggle ${sch.name}`}
                  />
                  <span
                    className={`text-sm font-semibold truncate ${
                      sch.enabled ? 'text-slate-900' : 'text-slate-400 line-through'
                    }`}
                  >
                    {sch.name}
                  </span>
                </div>
                {/* Unboxed Metadata */}
                <div className="mt-1 pl-6 flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-slate-500">
                  <span>{sheetObj?.name || 'Sheet'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-indigo-700">
                    {sch.cadence === 'cron'
                      ? `Cron: ${sch.cronExpression}`
                      : `${sch.cadence} at ${sch.timeOfDay} (${sch.timezone})`}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {sch.filterEnabled
                      ? `Filter: Col ${sch.filterColumn} ${sch.filterOperator.replace(/_/g, ' ')} ${sch.filterValue}`
                      : 'All Rows'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {sch.runCount} runs
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRunScheduleNow(sch);
                    setDispatchedId(sch.id);
                    setTimeout(() => setDispatchedId(null), 1600);
                  }}
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-colors whitespace-nowrap flex items-center gap-1"
                >
                  {dispatchedId === sch.id ? (
                    <>
                      <Check className="w-3 h-3" />
                      Dispatched
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" />
                      Run Digest Now
                    </>
                  )}
                </button>
                {schedules.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSchedule(sch.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Schedule Editor */}
      {activeSchedule && (
        <div className="border border-slate-200 rounded-md bg-white p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="text-sm font-semibold text-slate-900">
              Schedule Timing, Row Filter &amp; Digest Formatting
            </div>
            <button
              type="button"
              onClick={() => onRunScheduleNow(activeSchedule)}
              className="px-3 py-1 text-xs font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-600 hover:text-white transition-colors whitespace-nowrap"
            >
              Compile &amp; Send Digest Now
            </button>
          </div>

          {/* Name & Source Sheet */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Schedule Name
              </label>
              <input
                type="text"
                value={activeSchedule.name}
                onChange={(e) =>
                  onUpdateSchedule({ ...activeSchedule, name: e.target.value })
                }
                className="w-full px-3 py-1.5 text-xs text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Source Google Sheet Tab
              </label>
              <select
                value={activeSchedule.sheetId}
                onChange={(e) =>
                  onUpdateSchedule({
                    ...activeSchedule,
                    sheetId: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 text-xs text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-indigo-600"
              >
                {sheets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cadence, Time of Day, Timezone */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Execution Cadence
              </label>
              <select
                value={activeSchedule.cadence}
                onChange={(e) =>
                  onUpdateSchedule({
                    ...activeSchedule,
                    cadence: e.target.value as ReportCadence,
                  })
                }
                className="w-full px-3 py-1.5 text-xs text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-indigo-600"
              >
                <option value="hourly">Hourly Rollup</option>
                <option value="daily">Daily Digest</option>
                <option value="weekly">Weekly Summary</option>
                <option value="monthly">Monthly Close (1st of Month)</option>
                <option value="cron">Custom Cron Expression</option>
              </select>
            </div>

            {activeSchedule.cadence === 'cron' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  5-Field Cron Expression
                </label>
                <input
                  type="text"
                  value={activeSchedule.cronExpression}
                  onChange={(e) =>
                    onUpdateSchedule({
                      ...activeSchedule,
                      cronExpression: e.target.value,
                    })
                  }
                  placeholder="0 */2 * * 1-5"
                  className="w-full px-3 py-1.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-indigo-600"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Execution Time (24h)
                </label>
                <input
                  type="time"
                  value={activeSchedule.timeOfDay}
                  onChange={(e) =>
                    onUpdateSchedule({
                      ...activeSchedule,
                      timeOfDay: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-indigo-600"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Report Timezone
              </label>
              <select
                value={activeSchedule.timezone}
                onChange={(e) =>
                  onUpdateSchedule({
                    ...activeSchedule,
                    timezone: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-indigo-600"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            {(activeSchedule.cadence === 'daily' ||
              activeSchedule.cadence === 'weekly') && (
              <div className="sm:col-span-3 pt-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Active Days of Week
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {DAYS_OF_WEEK.map((d) => {
                    const isOn = activeSchedule.daysOfWeek.includes(d.day);
                    return (
                      <button
                        key={d.day}
                        type="button"
                        onClick={() => toggleDayOfWeek(d.day)}
                        className={`px-3 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap ${
                          isOn
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {d.short}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Row Filter Builder */}
          <div className="space-y-3 border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeSchedule.filterEnabled}
                  onChange={(e) =>
                    onUpdateSchedule({
                      ...activeSchedule,
                      filterEnabled: e.target.checked,
                    })
                  }
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  Filter included rows by cell condition (uncheck to include entire sheet)
                </span>
              </label>
            </div>

            {activeSchedule.filterEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Filter Column
                  </label>
                  <select
                    value={activeSchedule.filterColumn}
                    onChange={(e) =>
                      onUpdateSchedule({
                        ...activeSchedule,
                        filterColumn: e.target.value as ColumnKey,
                      })
                    }
                    className="w-full px-2.5 py-1 text-xs font-mono bg-white border border-slate-300 rounded"
                  >
                    {COLUMN_KEYS.map((col) => (
                      <option key={col} value={col}>
                        Col {col} · {targetSheet.headers[col]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Comparison
                  </label>
                  <select
                    value={activeSchedule.filterOperator}
                    onChange={(e) =>
                      onUpdateSchedule({
                        ...activeSchedule,
                        filterOperator: e.target.value as ReportSchedule['filterOperator'],
                      })
                    }
                    className="w-full px-2.5 py-1 text-xs font-mono bg-white border border-slate-300 rounded"
                  >
                    <option value="less_than">Less Than (&lt;)</option>
                    <option value="greater_than">Greater Than (&gt;)</option>
                    <option value="equals">Equals (==)</option>
                    <option value="not_equals">Not Equals (!=)</option>
                    <option value="contains">Contains</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Filter Threshold / Value
                  </label>
                  <input
                    type="text"
                    value={activeSchedule.filterValue}
                    onChange={(e) =>
                      onUpdateSchedule({
                        ...activeSchedule,
                        filterValue: e.target.value,
                      })
                    }
                    className="w-full px-2.5 py-1 text-xs font-mono bg-white border border-slate-300 rounded"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Delivery Format & KPI Summary Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200 pt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Report Payload Format
              </label>
              <select
                value={activeSchedule.format}
                onChange={(e) =>
                  onUpdateSchedule({
                    ...activeSchedule,
                    format: e.target.value as ReportFormat,
                  })
                }
                className="w-full px-3 py-1.5 text-xs text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-indigo-600"
              >
                <option value="html_table">Inline HTML Data Table</option>
                <option value="csv_attachment">CSV File Attachment Only</option>
                <option value="both">
                  Inline HTML Table + Attached CSV Snapshot
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Summary KPI Aggregation Column (Sum / Average)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={activeSchedule.includeSummaryKpis}
                  onChange={(e) =>
                    onUpdateSchedule({
                      ...activeSchedule,
                      includeSummaryKpis: e.target.checked,
                    })
                  }
                  className="rounded border-slate-300 text-indigo-600"
                />
                <select
                  value={activeSchedule.summaryNumericColumn}
                  disabled={!activeSchedule.includeSummaryKpis}
                  onChange={(e) =>
                    onUpdateSchedule({
                      ...activeSchedule,
                      summaryNumericColumn: e.target.value as ColumnKey,
                    })
                  }
                  className="flex-1 px-3 py-1.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded disabled:opacity-50"
                >
                  {COLUMN_KEYS.map((col) => (
                    <option key={col} value={col}>
                      Column {col} ({targetSheet.headers[col]})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Recipients, Subject, Intro Notes */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Digest Recipients (Comma-separated emails)
              </label>
              <input
                type="text"
                value={activeSchedule.recipients}
                onChange={(e) =>
                  onUpdateSchedule({
                    ...activeSchedule,
                    recipients: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Digest Email Subject Line
              </label>
              <input
                type="text"
                value={activeSchedule.subjectTemplate}
                onChange={(e) =>
                  onUpdateSchedule({
                    ...activeSchedule,
                    subjectTemplate: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Executive Summary Note (Rendered above table)
              </label>
              <textarea
                rows={2}
                value={activeSchedule.introNotes}
                onChange={(e) =>
                  onUpdateSchedule({
                    ...activeSchedule,
                    introNotes: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 text-xs text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Next 5 Scheduled Runs Calculator */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <CalendarClock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Next 5 Computed Execution Windows ({activeSchedule.timezone})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs font-mono text-slate-700 tabular-nums">
              {nextRuns.map((runStr, idx) => (
                <div
                  key={idx}
                  className="px-2.5 py-1 bg-white border border-slate-200/80 rounded flex items-center justify-between"
                >
                  <span className="text-slate-400">Run #{idx + 1}</span>
                  <span>{runStr}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
