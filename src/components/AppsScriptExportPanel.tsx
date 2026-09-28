import React, { useState } from 'react';
import {
  CellTriggerRule,
  ReportSchedule,
  SmtpConfig,
  SpreadsheetTab,
} from '../types/extension';
import {
  generateAppsScriptCodeGs,
  generateAppsScriptManifest,
  generateSidebarHtml,
  generateSmtpRelayWorkerJs,
} from '../utils/codeGenerator';
import { Check, Copy, Download, FileCode2, Terminal } from 'lucide-react';

interface AppsScriptExportPanelProps {
  sheets: SpreadsheetTab[];
  triggers: CellTriggerRule[];
  schedules: ReportSchedule[];
  smtpConfig: SmtpConfig;
}

type ExportFileKey = 'Code.gs' | 'Sidebar.html' | 'smtp-relay-worker.js' | 'appsscript.json';

export const AppsScriptExportPanel: React.FC<AppsScriptExportPanelProps> = ({
  sheets,
  triggers,
  schedules,
  smtpConfig,
}) => {
  const [selectedFile, setSelectedFile] = useState<ExportFileKey>('Code.gs');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const codeGsContent = generateAppsScriptCodeGs({
    sheets,
    triggers,
    schedules,
    smtpConfig,
  });
  const sidebarHtmlContent = generateSidebarHtml(smtpConfig);
  const workerJsContent = generateSmtpRelayWorkerJs(smtpConfig);
  const manifestJsonContent = generateAppsScriptManifest(
    schedules[0]?.timezone || 'America/Chicago'
  );

  const fileMap: Record<ExportFileKey, { content: string; description: string }> = {
    'Code.gs': {
      content: codeGsContent,
      description:
        'Primary Google Apps Script extension containing your active cell triggers, report schedules, cooldown cache, and SMTP dispatcher.',
    },
    'Sidebar.html': {
      content: sidebarHtmlContent,
      description:
        'In-Sheet sidebar interface for storing SMTP secrets in PropertiesService and manually triggering digests.',
    },
    'smtp-relay-worker.js': {
      content: workerJsContent,
      description:
        'Lightweight Node.js + Nodemailer bridge for routing Apps Script UrlFetchApp calls to custom TCP/TLS SMTP ports (587/465/2525).',
    },
    'appsscript.json': {
      content: manifestJsonContent,
      description:
        'Google Apps Script V8 runtime manifest declaring required spreadsheet, mail, trigger, and external request scopes.',
    },
  };

  const currentFile = fileMap[selectedFile];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopiedFile(selectedFile);
    setTimeout(() => setCopiedFile(null), 1800);
  };

  const handleDownloadFile = (filename: ExportFileKey) => {
    const blob = new Blob([fileMap[filename].content], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllBundle = () => {
    const bundle = {
      exportedAt: new Date().toISOString(),
      extensionName: 'SheetPulse Google Sheets Extension',
      files: {
        'Code.gs': codeGsContent,
        'Sidebar.html': sidebarHtmlContent,
        'smtp-relay-worker.js': workerJsContent,
        'appsscript.json': JSON.parse(manifestJsonContent),
      },
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sheetpulse-extension-bundle.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            04. Adaptable Google Apps Script &amp; SMTP Extension Code
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Live-compiled JavaScript extension code synchronized with your {triggers.filter((t) => t.enabled).length} active cell rules, {schedules.filter((s) => s.enabled).length} report schedules, and {smtpConfig.host}:{smtpConfig.port} settings.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadAllBundle}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          Download Full Extension Bundle
        </button>
      </div>

      {/* 4-Step Google Sheets Deployment Guide */}
      <div className="border border-slate-200 rounded-md bg-white p-4">
        <div className="text-xs font-semibold text-slate-900 mb-3">
          Deployment into Any Google Sheet (4 Steps)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1">
            <div className="font-mono font-semibold text-emerald-700">
              01. Open Script Editor
            </div>
            <p className="text-slate-600 leading-relaxed">
              In your Google Sheet, navigate to{' '}
              <span className="font-mono text-slate-800">
                Extensions → Apps Script
              </span>
              .
            </p>
          </div>
          <div className="space-y-1">
            <div className="font-mono font-semibold text-emerald-700">
              02. Paste Code.gs &amp; Sidebar
            </div>
            <p className="text-slate-600 leading-relaxed">
              Replace default code with <span className="font-mono">Code.gs</span> and add an HTML file named <span className="font-mono">Sidebar.html</span>.
            </p>
          </div>
          <div className="space-y-1">
            <div className="font-mono font-semibold text-emerald-700">
              03. Configure SMTP Bridge
            </div>
            <p className="text-slate-600 leading-relaxed">
              Deploy <span className="font-mono">smtp-relay-worker.js</span> for custom SMTP ports 587/465 or use native MailApp fallback.
            </p>
          </div>
          <div className="space-y-1">
            <div className="font-mono font-semibold text-emerald-700">
              04. Activate Sheet Triggers
            </div>
            <p className="text-slate-600 leading-relaxed">
              Run <span className="font-mono">installSheetPulseTriggers()</span> once to bind <span className="font-mono">onEdit</span> and hourly timers.
            </p>
          </div>
        </div>
      </div>

      {/* File Selector Tabs + Actions */}
      <div className="border border-slate-200 rounded-md overflow-hidden bg-[#0F172A]">
        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {(Object.keys(fileMap) as ExportFileKey[]).map((fname) => {
              const isSelected = selectedFile === fname;
              return (
                <button
                  key={fname}
                  type="button"
                  onClick={() => setSelectedFile(fname)}
                  className={`px-3 py-1.5 text-xs font-mono rounded transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    isSelected
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  {fname}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              {copiedFile === selectedFile ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied {selectedFile}
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy {selectedFile}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleDownloadFile(selectedFile)}
              className="px-3 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Download File
            </button>
          </div>
        </div>

        {/* File Context Description Bar */}
        <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{currentFile.description}</span>
          </div>
          <span className="font-mono tabular-nums text-slate-500 shrink-0">
            {currentFile.content.split('\n').length} lines
          </span>
        </div>

        {/* Code Viewer */}
        <pre className="p-5 text-xs font-mono text-slate-200 overflow-x-auto max-h-[540px] leading-relaxed select-all">
          <code>{currentFile.content}</code>
        </pre>
      </div>
    </div>
  );
};
