import React, { useState, useEffect } from 'react';
import {
  COLUMN_KEYS,
  CellTriggerRule,
  ColumnKey,
  DispatchLogEntry,
  SpreadsheetTab,
} from '../types/extension';
import { getWatchingRulesForCell } from '../utils/triggerEngine';
import {
  Play,
  Plus,
  RotateCcw,
  Mail,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';

interface SpreadsheetSandboxProps {
  sheets: SpreadsheetTab[];
  activeSheetId: string;
  onSelectSheet: (sheetId: string) => void;
  selectedCell: { col: ColumnKey; rowNumber: number };
  onSelectCell: (col: ColumnKey, rowNumber: number) => void;
  onCellCommit: (
    sheetId: string,
    col: ColumnKey,
    rowNumber: number,
    newValue: string
  ) => void;
  onAddRow: (sheetId: string) => void;
  onResetSheets: () => void;
  triggers: CellTriggerRule[];
  dispatchLogs: DispatchLogEntry[];
  onInspectLog: (log: DispatchLogEntry) => void;
  lastTriggeredCellKey: string | null;
}

export const SpreadsheetSandbox: React.FC<SpreadsheetSandboxProps> = ({
  sheets,
  activeSheetId,
  onSelectSheet,
  selectedCell,
  onSelectCell,
  onCellCommit,
  onAddRow,
  onResetSheets,
  triggers,
  dispatchLogs,
  onInspectLog,
  lastTriggeredCellKey,
}) => {
  const activeSheet =
    sheets.find((s) => s.id === activeSheetId) || sheets[0];

  const currentRowObj =
    activeSheet.rows.find((r) => r.rowNumber === selectedCell.rowNumber) ||
    activeSheet.rows[0];

  const selectedCellValue =
    currentRowObj?.cells[selectedCell.col] ?? '';

  const [formulaInput, setFormulaInput] = useState<string>(selectedCellValue);
  const [editingCell, setEditingCell] = useState<{
    col: ColumnKey;
    rowNumber: number;
  } | null>(null);
  const [inlineDraft, setInlineDraft] = useState<string>('');

  useEffect(() => {
    setFormulaInput(selectedCellValue);
  }, [selectedCellValue, selectedCell.col, selectedCell.rowNumber, activeSheetId]);

  const handleFormulaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRowObj) return;
    onCellCommit(
      activeSheet.id,
      selectedCell.col,
      selectedCell.rowNumber,
      formulaInput
    );
  };

  const startInlineEdit = (
    col: ColumnKey,
    rowNumber: number,
    currentVal: string
  ) => {
    onSelectCell(col, rowNumber);
    setEditingCell({ col, rowNumber });
    setInlineDraft(currentVal);
  };

  const commitInlineEdit = () => {
    if (!editingCell) return;
    onCellCommit(
      activeSheet.id,
      editingCell.col,
      editingCell.rowNumber,
      inlineDraft
    );
    setEditingCell(null);
  };

  const watchingSelectedCell = getWatchingRulesForCell(
    triggers,
    activeSheet.id,
    selectedCell.col,
    selectedCell.rowNumber
  );

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 select-none">
      {/* Top Sandbox Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50/70">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-900">
              Live Google Sheets Sandbox
            </span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{activeSheet.description}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onAddRow(activeSheet.id)}
            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors whitespace-nowrap flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Row
          </button>
          <button
            type="button"
            onClick={onResetSheets}
            className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors whitespace-nowrap flex items-center gap-1"
            title="Reset sample spreadsheet data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Data
          </button>
        </div>
      </div>

      {/* Quick One-Click Trigger Simulation Bar */}
      <div className="px-4 py-2 border-b border-slate-200 bg-emerald-50/40 flex items-center justify-between gap-3 overflow-x-auto">
        <div className="text-xs text-slate-600 whitespace-nowrap shrink-0">
          <span className="font-semibold text-emerald-900">Simulate Edit</span>
          <span className="mx-1.5 text-slate-300">|</span>
          <span>Click a preset or double-click any cell below:</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {activeSheet.quickSimulations.map((sim, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onSelectCell(sim.col, sim.rowNumber);
                onCellCommit(
                  activeSheet.id,
                  sim.col,
                  sim.rowNumber,
                  sim.newValue
                );
              }}
              className="px-2.5 py-1 text-xs font-medium text-emerald-900 bg-white border border-emerald-300/80 rounded hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors whitespace-nowrap flex items-center gap-1 shadow-2xs"
              title={sim.description}
            >
              <Play className="w-3 h-3 fill-current" />
              {sim.label}
            </button>
          ))}
        </div>
      </div>

      {/* Formula / Cell Coordinate Bar */}
      <form
        onSubmit={handleFormulaSubmit}
        className="px-3 py-1.5 border-b border-slate-200 flex items-center gap-2 bg-white"
      >
        <div className="w-14 px-2 py-1 text-xs font-mono font-semibold text-slate-800 bg-slate-100 border border-slate-200 rounded text-center tabular-nums shrink-0">
          {selectedCell.col}
          {selectedCell.rowNumber}
        </div>
        <span className="text-xs font-mono italic text-slate-400 px-1 shrink-0">
          fx
        </span>
        <input
          type="text"
          value={formulaInput}
          onChange={(e) => setFormulaInput(e.target.value)}
          placeholder={`Edit value in ${selectedCell.col}${selectedCell.rowNumber} and press Enter...`}
          className="flex-1 min-w-0 text-xs font-mono text-slate-900 bg-slate-50/70 border border-slate-200 rounded px-2.5 py-1 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
        />
        <button
          type="submit"
          className="px-3 py-1 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
        >
          Apply Edit
        </button>
      </form>

      {/* Active Cell Trigger Coverage Status Line (Unboxed Zero-Pill Metadata) */}
      <div className="px-4 py-1.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2 truncate">
          <span className="font-mono font-medium text-slate-700">
            {activeSheet.name}!{selectedCell.col}
            {selectedCell.rowNumber}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Column: {activeSheet.headers[selectedCell.col]}
          </span>
          <span aria-hidden="true">·</span>
          {watchingSelectedCell.length > 0 ? (
            <span className="text-emerald-700 font-medium truncate">
              Monitored by {watchingSelectedCell.length} active rule
              {watchingSelectedCell.length > 1 ? 's' : ''} (
              {watchingSelectedCell.map((r) => r.name).join(', ')})
            </span>
          ) : (
            <span className="text-slate-400">
              No active cell trigger attached to this coordinate
            </span>
          )}
        </div>
      </div>

      {/* Spreadsheet Grid Table */}
      <div className="flex-1 overflow-auto bg-slate-100/50">
        <table className="w-full border-collapse text-left table-fixed bg-white">
          <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-300">
            <tr>
              <th className="w-10 py-1.5 text-center text-[11px] font-mono font-medium text-slate-400 border-r border-slate-200 bg-slate-100">
                #
              </th>
              {COLUMN_KEYS.map((col) => {
                const colWatched = triggers.some(
                  (t) =>
                    t.enabled &&
                    (t.sheetId === 'ALL' || t.sheetId === activeSheet.id) &&
                    t.column === col
                );
                return (
                  <th
                    key={col}
                    className={`px-2.5 py-1.5 text-[11px] font-semibold border-r border-slate-200 select-none ${
                      colWatched
                        ? 'bg-emerald-50/70 text-emerald-950 border-b-2 border-b-emerald-500'
                        : 'text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-slate-400">{col}</span>
                      <span className="truncate font-sans text-slate-700">
                        {activeSheet.headers[col]}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {activeSheet.rows.map((row) => (
              <tr
                key={row.rowNumber}
                className="border-b border-slate-200 hover:bg-slate-50/60 transition-colors"
              >
                {/* Row Number Header */}
                <td className="py-1.5 text-center text-[11px] font-mono text-slate-400 bg-slate-50 border-r border-slate-200 tabular-nums">
                  {row.rowNumber}
                </td>

                {COLUMN_KEYS.map((col) => {
                  const isSelected =
                    selectedCell.col === col &&
                    selectedCell.rowNumber === row.rowNumber;
                  const isEditing =
                    editingCell?.col === col &&
                    editingCell?.rowNumber === row.rowNumber;
                  const cellRules = getWatchingRulesForCell(
                    triggers,
                    activeSheet.id,
                    col,
                    row.rowNumber
                  );
                  const isWatched = cellRules.length > 0;
                  const cellKey = `${activeSheet.id}:${col}${row.rowNumber}`;
                  const justTriggered = lastTriggeredCellKey === cellKey;
                  const val = row.cells[col] || '';
                  const isNumeric = activeSheet.columnTypes[col] === 'number';

                  return (
                    <td
                      key={col}
                      onClick={() => onSelectCell(col, row.rowNumber)}
                      onDoubleClick={() =>
                        startInlineEdit(col, row.rowNumber, val)
                      }
                      className={`relative h-9 px-2.5 text-xs border-r border-slate-200 cursor-cell transition-colors ${
                        isNumeric ? 'text-right font-mono tabular-nums' : 'text-left'
                      } ${
                        justTriggered
                          ? 'bg-emerald-100/90 text-emerald-950 font-semibold'
                          : isSelected
                          ? 'bg-emerald-50/40 outline-2 -outline-offset-2 outline-emerald-600 z-1'
                          : isWatched
                          ? 'bg-emerald-50/15'
                          : ''
                      }`}
                    >
                      {/* Subtle Corner Indicator for Monitored Cells */}
                      {isWatched && (
                        <span
                          className="absolute top-0 right-0 w-0 h-0 border-t-[5px] border-t-emerald-500 border-l-[5px] border-l-transparent"
                          title={`Watched by: ${cellRules
                            .map((r) => r.name)
                            .join(', ')}`}
                        />
                      )}

                      {isEditing ? (
                        <input
                          type="text"
                          autoFocus
                          value={inlineDraft}
                          onChange={(e) => setInlineDraft(e.target.value)}
                          onBlur={commitInlineEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitInlineEdit();
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                          className="w-full h-full bg-white text-slate-900 font-mono text-xs px-1 py-0.5 border border-emerald-600 rounded focus:outline-none"
                        />
                      ) : (
                        <div className="truncate">
                          {isNumeric && val && !Number.isNaN(Number(val)) && activeSheet.id === 'sheet_revenue'
                            ? `$${Number(val).toLocaleString()}`
                            : val}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Google Sheets Bottom Sheet Tabs Bar */}
      <div className="px-3 py-1.5 bg-slate-100 border-t border-b border-slate-200 flex items-center gap-1 overflow-x-auto">
        {sheets.map((sheet) => {
          const isActive = sheet.id === activeSheet.id;
          const sheetRuleCount = triggers.filter(
            (t) => t.enabled && (t.sheetId === 'ALL' || t.sheetId === sheet.id)
          ).length;

          return (
            <button
              key={sheet.id}
              type="button"
              onClick={() => {
                onSelectSheet(sheet.id);
                onSelectCell('D', 2);
              }}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                isActive
                  ? 'bg-white text-emerald-900 font-semibold shadow-2xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <span>{sheet.name}</span>
              <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                ({sheetRuleCount})
              </span>
            </button>
          );
        })}
      </div>

      {/* Live Dispatch & Trigger Evaluation Log */}
      <div className="h-56 flex flex-col bg-white">
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Terminal className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-900">
              Real-Time Trigger & SMTP Dispatch Stream
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {dispatchLogs.length} event{dispatchLogs.length === 1 ? '' : 's'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Click any event to inspect HTML payload &amp; SMTP transcript
          </span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {dispatchLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No email notifications triggered yet. Edit a monitored cell above or click a Simulate button.
            </div>
          ) : (
            dispatchLogs.map((log) => (
              <div
                key={log.id}
                onClick={() => onInspectLog(log)}
                className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    {log.status === 'failed' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                    <span className="font-semibold text-slate-900 truncate">
                      {log.subject}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 truncate">
                    <span className="font-mono text-slate-700">
                      {log.sheetName}!{log.cellCoord}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">
                      {log.oldValue} → {log.newValue}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">To: {log.recipient}</span>
                  </div>
                </div>

                <div className="text-right shrink-0 flex flex-col items-end">
                  <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 tabular-nums">
                    <span>{log.durationMs}ms</span>
                    <span aria-hidden="true">·</span>
                    <span>{log.timestamp.slice(11, 19)}</span>
                    <ArrowUpRight className="w-3 h-3 text-slate-400" />
                  </div>
                  <div className="mt-0.5 text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    <span>Inspect Email</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
