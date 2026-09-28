import React, { useState } from 'react';
import {
  COLUMN_KEYS,
  CellTriggerRule,
  ColumnKey,
  CooldownPolicy,
  SpreadsheetRow,
  SpreadsheetTab,
  TriggerOperator,
  TriggerScopeType,
} from '../types/extension';
import {
  buildInterpolationMap,
  interpolateTemplate,
} from '../utils/triggerEngine';
import { Plus, Trash2, Zap, Check, Eye } from 'lucide-react';

interface CellTriggersPanelProps {
  triggers: CellTriggerRule[];
  sheets: SpreadsheetTab[];
  activeSheet: SpreadsheetTab;
  selectedCell: { col: ColumnKey; rowNumber: number };
  onUpdateTrigger: (updated: CellTriggerRule) => void;
  onCreateTrigger: (newRule: CellTriggerRule) => void;
  onDeleteTrigger: (ruleId: string) => void;
  onTestTriggerRule: (rule: CellTriggerRule) => void;
}

const OPERATOR_LABELS: { value: TriggerOperator; label: string }[] = [
  { value: 'less_than', label: 'Less Than (<)' },
  { value: 'greater_than', label: 'Greater Than (>)' },
  { value: 'equals', label: 'Equals (==)' },
  { value: 'not_equals', label: 'Does Not Equal (!=)' },
  { value: 'changes_to', label: 'Changes To (→ Value)' },
  { value: 'changes_from_to', label: 'Transition (Old → New)' },
  { value: 'contains', label: 'Contains Substring' },
  { value: 'not_empty', label: 'Is Not Empty' },
];

const COOLDOWN_LABELS: { value: CooldownPolicy; label: string }[] = [
  { value: 'immediate', label: 'Send on every matching edit' },
  { value: 'once_per_row_value', label: 'Once per unique row value (Deduplicate)' },
  { value: 'throttle_15m', label: 'Throttle 15 minutes per row' },
  { value: 'daily_once', label: 'Max once per 24 hours per row' },
];

export const CellTriggersPanel: React.FC<CellTriggersPanelProps> = ({
  triggers,
  sheets,
  activeSheet,
  selectedCell,
  onUpdateTrigger,
  onCreateTrigger,
  onDeleteTrigger,
  onTestTriggerRule,
}) => {
  const [selectedRuleId, setSelectedRuleId] = useState<string>(
    triggers[0]?.id || ''
  );
  const [activeFieldForTokens, setActiveFieldForTokens] = useState<
    'recipientTemplate' | 'subjectTemplate' | 'bodyTemplate'
  >('subjectTemplate');
  const [firedFeedbackId, setFiredFeedbackId] = useState<string | null>(null);

  const activeRule =
    triggers.find((t) => t.id === selectedRuleId) || triggers[0];

  const handleAddNewRule = () => {
    const newId = `trg_${Date.now().toString(36)}`;
    const newRule: CellTriggerRule = {
      id: newId,
      name: `Watch ${activeSheet.name} (${selectedCell.col}${selectedCell.rowNumber})`,
      enabled: true,
      sheetId: activeSheet.id,
      scopeType: 'column',
      column: selectedCell.col,
      range: `${selectedCell.col}2:${selectedCell.col}100`,
      cell: `${selectedCell.col}${selectedCell.rowNumber}`,
      operator: 'equals',
      value: 'Critical',
      previousValue: '',
      cooldown: 'once_per_row_value',
      recipientTemplate: '{{F}}, ops-alerts@voltgrid.io',
      ccTemplate: '',
      subjectTemplate: `[SheetPulse] {{A}} ({{B}}) updated to {{newValue}} in {{sheetName}}`,
      bodyTemplate: `Cell {{cell}} in sheet "{{sheetName}}" (Row {{row}}) matched your trigger condition.\n\nItem: {{B}} ({{A}})\nNew Value: {{newValue}} (previous: {{oldValue}})\nResponsible Contact: {{F}}`,
      includeRowSnapshot: true,
      priority: 'normal',
      lastTriggeredAt: null,
      triggerCount: 0,
    };
    onCreateTrigger(newRule);
    setSelectedRuleId(newId);
  };

  const insertToken = (token: string) => {
    if (!activeRule) return;
    const currentVal = activeRule[activeFieldForTokens] || '';
    const separator =
      activeFieldForTokens === 'recipientTemplate' && currentVal.trim().length > 0
        ? ', '
        : '';
    onUpdateTrigger({
      ...activeRule,
      [activeFieldForTokens]: `${currentVal}${separator}{{${token}}}`,
    });
  };

  // Build live preview using currently selected row in the active sheet
  const previewRow: SpreadsheetRow =
    activeSheet.rows.find((r) => r.rowNumber === selectedCell.rowNumber) ||
    activeSheet.rows[0];

  const previewVars = buildInterpolationMap(
    activeSheet,
    previewRow,
    activeRule?.column || selectedCell.col,
    previewRow.cells[activeRule?.column || selectedCell.col] || '25',
    activeRule?.value || 'Critical'
  );

  const previewTo = activeRule
    ? interpolateTemplate(activeRule.recipientTemplate, previewVars)
    : '';
  const previewSubject = activeRule
    ? interpolateTemplate(activeRule.subjectTemplate, previewVars)
    : '';
  const previewBody = activeRule
    ? interpolateTemplate(activeRule.bodyTemplate, previewVars)
    : '';

  return (
    <div className="p-6 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            01. Cell Data Trigger Rules
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Define cell coordinate, range, or column conditions that automatically dispatch templated emails on edit.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddNewRule}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors whitespace-nowrap flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          New Cell Trigger Rule
        </button>
      </div>

      {/* Rule Selector List */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-700">
          Configured Rules ({triggers.filter((t) => t.enabled).length} active of{' '}
          {triggers.length})
        </div>
        <div className="border border-slate-200 rounded-md bg-white divide-y divide-slate-200">
          {triggers.map((rule) => {
            const isSelected = rule.id === activeRule?.id;
            const sheetObj = sheets.find((s) => s.id === rule.sheetId);
            const scopeDesc =
              rule.scopeType === 'column'
                ? `Col ${rule.column}`
                : rule.scopeType === 'range'
                ? rule.range
                : rule.cell;

            return (
              <div
                key={rule.id}
                onClick={() => setSelectedRuleId(rule.id)}
                className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                  isSelected ? 'bg-emerald-50/40' : 'hover:bg-slate-50'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(e) => {
                        e.stopPropagation();
                        onUpdateTrigger({ ...rule, enabled: e.target.checked });
                      }}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      aria-label={`Toggle ${rule.name}`}
                    />
                    <span
                      className={`text-sm font-semibold truncate ${
                        rule.enabled ? 'text-slate-900' : 'text-slate-400 line-through'
                      }`}
                    >
                      {rule.name}
                    </span>
                  </div>
                  {/* Zero-Pill Unboxed Metadata Line */}
                  <div className="mt-1 pl-6 flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-slate-500">
                    <span>{sheetObj ? sheetObj.name : 'All Sheets'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-slate-700">{scopeDesc}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-emerald-800">
                      {rule.operator.replace(/_/g, ' ')}{' '}
                      {rule.operator !== 'not_empty' ? `"${rule.value}"` : ''}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {rule.triggerCount} dispatches
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTestTriggerRule(rule);
                      setFiredFeedbackId(rule.id);
                      setTimeout(() => setFiredFeedbackId(null), 1600);
                    }}
                    className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors whitespace-nowrap flex items-center gap-1"
                    title="Force-evaluate and send test notification using selected spreadsheet row"
                  >
                    {firedFeedbackId === rule.id ? (
                      <>
                        <Check className="w-3 h-3" />
                        Sent
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3" />
                        Test Rule
                      </>
                    )}
                  </button>
                  {triggers.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTrigger(rule.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                      title="Delete rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Rule Configuration Editor */}
      {activeRule && (
        <div className="border border-slate-200 rounded-md bg-white p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="text-sm font-semibold text-slate-900">
              Rule Parameters &amp; Condition Logic
            </div>
            <div className="text-xs text-slate-500 font-mono">
              ID: {activeRule.id}
            </div>
          </div>

          {/* Row 1: Rule Name & Sheet Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rule Name
              </label>
              <input
                type="text"
                value={activeRule.name}
                onChange={(e) =>
                  onUpdateTrigger({ ...activeRule, name: e.target.value })
                }
                className="w-full px-3 py-1.5 text-xs text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Google Sheet Tab
              </label>
              <select
                value={activeRule.sheetId}
                onChange={(e) =>
                  onUpdateTrigger({ ...activeRule, sheetId: e.target.value })
                }
                className="w-full px-3 py-1.5 text-xs text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
              >
                {sheets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
                <option value="ALL">All Sheets in Workbook</option>
              </select>
            </div>
          </div>

          {/* Row 2: Scope Type, Target Coordinate/Range, Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cell Watch Scope
              </label>
              <select
                value={activeRule.scopeType}
                onChange={(e) =>
                  onUpdateTrigger({
                    ...activeRule,
                    scopeType: e.target.value as TriggerScopeType,
                  })
                }
                className="w-full px-3 py-1.5 text-xs text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
              >
                <option value="column">Entire Column (A–F)</option>
                <option value="range">A1 Cell Range (e.g. D2:D50)</option>
                <option value="cell">Single Cell Coordinate (e.g. E4)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {activeRule.scopeType === 'column'
                  ? 'Target Column'
                  : activeRule.scopeType === 'range'
                  ? 'A1 Range Notation'
                  : 'Exact Cell Coordinate'}
              </label>
              {activeRule.scopeType === 'column' ? (
                <select
                  value={activeRule.column}
                  onChange={(e) =>
                    onUpdateTrigger({
                      ...activeRule,
                      column: e.target.value as ColumnKey,
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
                >
                  {COLUMN_KEYS.map((col) => (
                    <option key={col} value={col}>
                      Column {col} ({activeSheet.headers[col]})
                    </option>
                  ))}
                </select>
              ) : activeRule.scopeType === 'range' ? (
                <input
                  type="text"
                  value={activeRule.range}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    const firstLetter = val.match(/[A-F]/)?.[0] as
                      | ColumnKey
                      | undefined;
                    onUpdateTrigger({
                      ...activeRule,
                      range: val,
                      column: firstLetter || activeRule.column,
                    });
                  }}
                  placeholder="D2:D50"
                  className="w-full px-3 py-1.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
                />
              ) : (
                <input
                  type="text"
                  value={activeRule.cell}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    const firstLetter = val.match(/[A-F]/)?.[0] as
                      | ColumnKey
                      | undefined;
                    onUpdateTrigger({
                      ...activeRule,
                      cell: val,
                      column: firstLetter || activeRule.column,
                    });
                  }}
                  placeholder="E4"
                  className="w-full px-3 py-1.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cooldown / Deduplication
              </label>
              <select
                value={activeRule.cooldown}
                onChange={(e) =>
                  onUpdateTrigger({
                    ...activeRule,
                    cooldown: e.target.value as CooldownPolicy,
                  })
                }
                className="w-full px-3 py-1.5 text-xs text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
              >
                {COOLDOWN_LABELS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Operator & Target Threshold Value */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Trigger Condition Operator
              </label>
              <select
                value={activeRule.operator}
                onChange={(e) =>
                  onUpdateTrigger({
                    ...activeRule,
                    operator: e.target.value as TriggerOperator,
                  })
                }
                className="w-full px-3 py-1.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
              >
                {OPERATOR_LABELS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>

            {activeRule.operator === 'changes_from_to' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Previous Cell Value (From)
                </label>
                <input
                  type="text"
                  value={activeRule.previousValue || ''}
                  onChange={(e) =>
                    onUpdateTrigger({
                      ...activeRule,
                      previousValue: e.target.value,
                    })
                  }
                  placeholder="e.g. Watch"
                  className="w-full px-3 py-1.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
                />
              </div>
            )}

            {activeRule.operator !== 'not_empty' && (
              <div
                className={
                  activeRule.operator === 'changes_from_to'
                    ? ''
                    : 'sm:col-span-2'
                }
              >
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {activeRule.operator === 'less_than' ||
                  activeRule.operator === 'greater_than'
                    ? 'Numeric Threshold Value'
                    : 'Target Match Value'}
                </label>
                <input
                  type="text"
                  value={activeRule.value}
                  onChange={(e) =>
                    onUpdateTrigger({ ...activeRule, value: e.target.value })
                  }
                  placeholder="Enter threshold or match string..."
                  className="w-full px-3 py-1.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
                />
              </div>
            )}
          </div>

          {/* Dynamic Cell Token Insertion Bar */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-semibold text-slate-800">
                Email Notification Template &amp; Dynamic Cell Tokens
              </span>
              <span className="text-[11px] text-slate-500">
                Inserting into:{' '}
                <strong className="font-mono text-emerald-700">
                  {activeFieldForTokens}
                </strong>
              </span>
            </div>

            <div className="flex items-center flex-wrap gap-1.5">
              {COLUMN_KEYS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => insertToken(col)}
                  className="px-2 py-1 text-[11px] font-mono text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 rounded transition-colors whitespace-nowrap"
                  title={`Insert column ${col} (${activeSheet.headers[col]})`}
                >
                  {`+ {{${col}}}`} ({activeSheet.headers[col].split(' ')[0]})
                </button>
              ))}
              {['row', 'cell', 'oldValue', 'newValue', 'sheetName'].map(
                (tok) => (
                  <button
                    key={tok}
                    type="button"
                    onClick={() => insertToken(tok)}
                    className="px-2 py-1 text-[11px] font-mono text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors whitespace-nowrap"
                  >
                    {`+ {{${tok}}}`}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Recipient & CC Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Recipients (To) — supports cell tokens like {'{{F}}'}
              </label>
              <input
                type="text"
                value={activeRule.recipientTemplate}
                onFocus={() => setActiveFieldForTokens('recipientTemplate')}
                onChange={(e) =>
                  onUpdateTrigger({
                    ...activeRule,
                    recipientTemplate: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                CC Recipients (Optional)
              </label>
              <input
                type="text"
                value={activeRule.ccTemplate}
                onChange={(e) =>
                  onUpdateTrigger({
                    ...activeRule,
                    ccTemplate: e.target.value,
                  })
                }
                placeholder="ops-lead@yourdomain.com"
                className="w-full px-3 py-1.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Subject & Body Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Subject Template
              </label>
              <input
                type="text"
                value={activeRule.subjectTemplate}
                onFocus={() => setActiveFieldForTokens('subjectTemplate')}
                onChange={(e) =>
                  onUpdateTrigger({
                    ...activeRule,
                    subjectTemplate: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Body Template
              </label>
              <textarea
                rows={4}
                value={activeRule.bodyTemplate}
                onFocus={() => setActiveFieldForTokens('bodyTemplate')}
                onChange={(e) =>
                  onUpdateTrigger({
                    ...activeRule,
                    bodyTemplate: e.target.value,
                  })
                }
                className="w-full px-3 py-2 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600 leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeRule.includeRowSnapshot}
                  onChange={(e) =>
                    onUpdateTrigger({
                      ...activeRule,
                      includeRowSnapshot: e.target.checked,
                    })
                  }
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  Append formatted HTML row snapshot table ({activeSheet.name}{' '}
                  columns A–F)
                </span>
              </label>
            </div>
          </div>

          {/* Live Row Interpolation Preview */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Live Template Preview (Interpolated with Row #{previewRow.rowNumber}{' '}
                  from {activeSheet.name})
                </span>
              </div>
              <button
                type="button"
                onClick={() => onTestTriggerRule(activeRule)}
                className="px-3 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-600 hover:text-white transition-colors whitespace-nowrap"
              >
                Dispatch Test Email for Row #{previewRow.rowNumber}
              </button>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded text-xs space-y-1.5">
              <div className="flex items-baseline gap-2">
                <span className="text-slate-400 w-16 shrink-0">To:</span>
                <span className="font-mono text-slate-800">{previewTo}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-slate-400 w-16 shrink-0">Subject:</span>
                <span className="font-semibold text-slate-900">
                  {previewSubject}
                </span>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-200/80 text-slate-700 whitespace-pre-line font-sans leading-relaxed">
                {previewBody}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
