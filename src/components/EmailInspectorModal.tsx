import React, { useState } from 'react';
import { DispatchLogEntry } from '../types/extension';
import { X, Mail, Terminal, FileCode, Check, Copy } from 'lucide-react';

interface EmailInspectorModalProps {
  log: DispatchLogEntry | null;
  onClose: () => void;
}

export const EmailInspectorModal: React.FC<EmailInspectorModalProps> = ({
  log,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'rendered' | 'smtp' | 'mime'>(
    'rendered'
  );
  const [copied, setCopied] = useState(false);

  if (!log) return null;

  const handleCopyMime = () => {
    navigator.clipboard.writeText(log.rawMime);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-3xl max-h-[88vh] flex flex-col shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-emerald-700">
                Dispatched Payload Inspector
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{log.messageId}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{log.durationMs}ms</span>
            </div>
            <h3 className="text-base font-semibold text-slate-900 mt-0.5 truncate">
              {log.subject}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-200/60 transition-colors"
            aria-label="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Envelope Metadata Summary */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block">Recipients (To / CC)</span>
            <span className="font-mono text-slate-800 break-all">
              {log.recipient}
              {log.cc ? ` (CC: ${log.cc})` : ''}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Trigger Origin</span>
            <span className="font-mono text-slate-800">
              {log.sourceName} ({log.sheetName}!{log.cellCoord})
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">SMTP Transport</span>
            <span className="font-mono text-slate-800">{log.transportUsed}</span>
          </div>
        </div>

        {/* Segmented View Switcher */}
        <div className="px-6 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-md">
            <button
              type="button"
              onClick={() => setActiveTab('rendered')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'rendered'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              Rendered HTML Email
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('smtp')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'smtp'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              SMTP Handshake Transcript
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mime')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'mime'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              Raw RFC 5322 MIME
            </button>
          </div>

          {activeTab === 'mime' && (
            <button
              type="button"
              onClick={handleCopyMime}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 flex items-center gap-1"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Copied MIME
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Raw MIME
                </>
              )}
            </button>
          )}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {activeTab === 'rendered' && (
            <div className="space-y-4">
              <div
                className="bg-white p-4 rounded border border-slate-200"
                dangerouslySetInnerHTML={{ __html: log.htmlBody }}
              />

              {Object.keys(log.interpolatedVars || {}).length > 0 && (
                <div className="bg-white p-4 rounded border border-slate-200">
                  <div className="text-xs font-semibold text-slate-800 mb-2">
                    Resolved Cell Template Variables
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    {Object.entries(log.interpolatedVars).map(([k, v]) => (
                      <div
                        key={k}
                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded truncate"
                      >
                        <span className="text-emerald-700 font-semibold">
                          {`{{${k}}}`}
                        </span>
                        <span className="text-slate-400 mx-1">=</span>
                        <span className="text-slate-800">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'smtp' && (
            <div className="bg-[#0F172A] text-slate-200 p-4 rounded-md font-mono text-xs space-y-1.5 overflow-x-auto">
              {log.smtpTranscript.map((line, i) => {
                const isClient = line.startsWith('>');
                const isOk = line.startsWith('220') || line.startsWith('235') || line.startsWith('250');
                const isErr = line.includes('[ERROR]');
                return (
                  <div
                    key={i}
                    className={`leading-relaxed ${
                      isErr
                        ? 'text-red-400 font-semibold'
                        : isClient
                        ? 'text-indigo-300'
                        : isOk
                        ? 'text-emerald-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {line}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'mime' && (
            <pre className="bg-[#0F172A] text-slate-200 p-4 rounded-md font-mono text-xs overflow-x-auto leading-relaxed whitespace-pre-wrap">
              {log.rawMime}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
