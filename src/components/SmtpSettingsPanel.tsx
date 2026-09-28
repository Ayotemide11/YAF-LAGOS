import React, { useState } from 'react';
import {
  SmtpConfig,
  SmtpEncryption,
  SmtpProviderMode,
} from '../types/extension';
import { SMTP_PRESETS } from '../data/initialData';
import {
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Terminal,
  Send,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface SmtpSettingsPanelProps {
  smtpConfig: SmtpConfig;
  onUpdateSmtp: (updated: SmtpConfig) => void;
  onVerifyHandshake: () => Promise<{
    ok: boolean;
    durationMs: number;
    transcript: string[];
    error?: string;
  }>;
  onSendTestEmail: (testRecipient: string) => Promise<void>;
}

export const SmtpSettingsPanel: React.FC<SmtpSettingsPanelProps> = ({
  smtpConfig,
  onUpdateSmtp,
  onVerifyHandshake,
  onSendTestEmail,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [testRecipient, setTestRecipient] = useState(
    'asherscreationz@gmail.com'
  );
  const [verifying, setVerifying] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [handshakeResult, setHandshakeResult] = useState<{
    ok: boolean;
    durationMs: number;
    transcript: string[];
    error?: string;
  } | null>(null);

  const handleApplyPreset = (preset: (typeof SMTP_PRESETS)[number]) => {
    onUpdateSmtp({
      ...smtpConfig,
      presetName: preset.name,
      host: preset.host,
      port: preset.port,
      encryption: preset.encryption,
      username: preset.usernameHint,
    });
  };

  const handleRunVerify = async () => {
    setVerifying(true);
    try {
      const res = await onVerifyHandshake();
      setHandshakeResult(res);
    } finally {
      setVerifying(false);
    }
  };

  const handleRunTestEmail = async () => {
    setSendingTest(true);
    try {
      await onSendTestEmail(testRecipient);
    } finally {
      setSendingTest(false);
    }
  };

  const addCustomHeader = () => {
    onUpdateSmtp({
      ...smtpConfig,
      customHeaders: [
        ...smtpConfig.customHeaders,
        { key: 'X-Custom-Tag', value: 'SheetPulse-Alert' },
      ],
    });
  };

  const updateCustomHeader = (
    idx: number,
    field: 'key' | 'value',
    val: string
  ) => {
    const next = smtpConfig.customHeaders.map((h, i) =>
      i === idx ? { ...h, [field]: val } : h
    );
    onUpdateSmtp({ ...smtpConfig, customHeaders: next });
  };

  const removeCustomHeader = (idx: number) => {
    onUpdateSmtp({
      ...smtpConfig,
      customHeaders: smtpConfig.customHeaders.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Section Header */}
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          03. Custom SMTP Server &amp; Delivery Architecture
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure external transactional SMTP relays (SendGrid, Amazon SES, Postmark, Mailgun, or private SMTP) alongside Google Apps Script native fallback.
        </p>
      </div>

      {/* Transport Mode & Execution Mode */}
      <div className="border border-slate-200 rounded-md bg-white p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Extension Email Transport Architecture
            </label>
            <select
              value={smtpConfig.providerMode}
              onChange={(e) =>
                onUpdateSmtp({
                  ...smtpConfig,
                  providerMode: e.target.value as SmtpProviderMode,
                })
              }
              className="w-full px-3 py-1.5 text-xs text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
            >
              <option value="custom_smtp">
                Custom SMTP Relay (Dedicated Host, Port &amp; Auth)
              </option>
              <option value="hybrid_fallback">
                Hybrid Failover (Custom SMTP Primary → Google MailApp Backup)
              </option>
              <option value="apps_script_native">
                Google Apps Script Native MailApp Only (No External SMTP)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Studio Handshake &amp; Dispatch Mode
            </label>
            <select
              value={smtpConfig.executionMode}
              onChange={(e) =>
                onUpdateSmtp({
                  ...smtpConfig,
                  executionMode: e.target.value as 'sandbox' | 'live',
                })
              }
              className="w-full px-3 py-1.5 text-xs text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
            >
              <option value="sandbox">
                Sandbox Inspector (Simulate RFC 5321 ESMTP &amp; Capture MIME)
              </option>
              <option value="live">
                Live Network TCP/SMTP (Connect to Real SMTP Server via Backend)
              </option>
            </select>
          </div>
        </div>

        {/* Provider Presets */}
        {smtpConfig.providerMode !== 'apps_script_native' && (
          <div className="pt-2 border-t border-slate-200">
            <div className="text-xs font-semibold text-slate-700 mb-2">
              Quick SMTP Provider Presets
            </div>
            <div className="flex items-center flex-wrap gap-1.5">
              {SMTP_PRESETS.map((preset) => {
                const isCurrent = smtpConfig.host === preset.host;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap ${
                      isCurrent
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Custom SMTP Server Connection Details */}
      {smtpConfig.providerMode !== 'apps_script_native' && (
        <div className="border border-slate-200 rounded-md bg-white p-5 space-y-5">
          <div className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-3">
            SMTP Host, Port, TLS Encryption &amp; Credentials
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SMTP Server Hostname
              </label>
              <input
                type="text"
                value={smtpConfig.host}
                onChange={(e) =>
                  onUpdateSmtp({ ...smtpConfig, host: e.target.value })
                }
                placeholder="smtp.sendgrid.net"
                className="w-full px-3 py-1.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SMTP Port
              </label>
              <input
                type="number"
                value={smtpConfig.port}
                onChange={(e) =>
                  onUpdateSmtp({
                    ...smtpConfig,
                    port: parseInt(e.target.value, 10) || 587,
                  })
                }
                className="w-full px-3 py-1.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded tabular-nums focus:outline-none focus:border-emerald-600"
              />
              <div className="mt-1 flex items-center gap-1 text-[11px] font-mono text-slate-500">
                {[587, 465, 2525, 25].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() =>
                      onUpdateSmtp({
                        ...smtpConfig,
                        port: p,
                        encryption: p === 465 ? 'SSL_TLS' : 'STARTTLS',
                      })
                    }
                    className="underline hover:text-slate-900"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                TLS Security Mode
              </label>
              <select
                value={smtpConfig.encryption}
                onChange={(e) =>
                  onUpdateSmtp({
                    ...smtpConfig,
                    encryption: e.target.value as SmtpEncryption,
                  })
                }
                className="w-full px-3 py-1.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
              >
                <option value="STARTTLS">STARTTLS (Port 587/2525)</option>
                <option value="SSL_TLS">Implicit SSL/TLS (Port 465)</option>
                <option value="NONE">Unencrypted / Internal Relay</option>
              </select>
            </div>
          </div>

          {/* Auth Username & Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SMTP Auth Username
              </label>
              <input
                type="text"
                value={smtpConfig.username}
                onChange={(e) =>
                  onUpdateSmtp({ ...smtpConfig, username: e.target.value })
                }
                className="w-full px-3 py-1.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SMTP Password / API Key (Stored in ScriptProperties)
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={smtpConfig.password}
                  onChange={(e) =>
                    onUpdateSmtp({ ...smtpConfig, password: e.target.value })
                  }
                  className="w-full pl-3 pr-9 py-1.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-700"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Google Apps Script UrlFetchApp Bridge Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Apps Script HTTPS Bridge Endpoint (UrlFetchApp Target)
              </label>
              <input
                type="text"
                value={smtpConfig.webhookRelayUrl}
                onChange={(e) =>
                  onUpdateSmtp({
                    ...smtpConfig,
                    webhookRelayUrl: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bridge Bearer Signing Secret
              </label>
              <div className="relative flex items-center">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={smtpConfig.webhookSecret}
                  onChange={(e) =>
                    onUpdateSmtp({
                      ...smtpConfig,
                      webhookSecret: e.target.value,
                    })
                  }
                  className="w-full pl-3 pr-9 py-1.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-700"
                >
                  {showSecret ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sender Identity, Rate Limits & Custom MIME Headers */}
      <div className="border border-slate-200 rounded-md bg-white p-5 space-y-5">
        <div className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-3">
          Sender Identity, Rate Governance &amp; Custom MIME Headers
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              From Display Name
            </label>
            <input
              type="text"
              value={smtpConfig.fromName}
              onChange={(e) =>
                onUpdateSmtp({ ...smtpConfig, fromName: e.target.value })
              }
              className="w-full px-3 py-1.5 text-xs text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              From Email Address
            </label>
            <input
              type="email"
              value={smtpConfig.fromEmail}
              onChange={(e) =>
                onUpdateSmtp({ ...smtpConfig, fromEmail: e.target.value })
              }
              className="w-full px-3 py-1.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reply-To Address
            </label>
            <input
              type="email"
              value={smtpConfig.replyTo}
              onChange={(e) =>
                onUpdateSmtp({ ...smtpConfig, replyTo: e.target.value })
              }
              className="w-full px-3 py-1.5 text-xs font-mono text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hourly Dispatch Cap (Emails / hr)
            </label>
            <input
              type="number"
              value={smtpConfig.rateLimitPerHour}
              onChange={(e) =>
                onUpdateSmtp({
                  ...smtpConfig,
                  rateLimitPerHour: parseInt(e.target.value, 10) || 100,
                })
              }
              className="w-full px-3 py-1.5 text-xs font-mono tabular-nums text-slate-900 bg-white border border-slate-300 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Max Retry Attempts on 4xx
            </label>
            <input
              type="number"
              value={smtpConfig.maxRetries}
              onChange={(e) =>
                onUpdateSmtp({
                  ...smtpConfig,
                  maxRetries: parseInt(e.target.value, 10) || 3,
                })
              }
              className="w-full px-3 py-1.5 text-xs font-mono tabular-nums text-slate-900 bg-white border border-slate-300 rounded"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Socket Timeout (ms)
            </label>
            <input
              type="number"
              value={smtpConfig.timeoutMs}
              onChange={(e) =>
                onUpdateSmtp({
                  ...smtpConfig,
                  timeoutMs: parseInt(e.target.value, 10) || 10000,
                })
              }
              className="w-full px-3 py-1.5 text-xs font-mono tabular-nums text-slate-900 bg-white border border-slate-300 rounded"
            />
          </div>
        </div>

        {/* Custom Headers */}
        <div className="pt-2 border-t border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              Custom Outbound MIME Headers
            </span>
            <button
              type="button"
              onClick={addCustomHeader}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add Header
            </button>
          </div>

          {smtpConfig.customHeaders.map((hdr, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={hdr.key}
                onChange={(e) => updateCustomHeader(idx, 'key', e.target.value)}
                placeholder="X-Header-Name"
                className="w-1/3 px-2.5 py-1 text-xs font-mono bg-white border border-slate-300 rounded"
              />
              <input
                type="text"
                value={hdr.value}
                onChange={(e) =>
                  updateCustomHeader(idx, 'value', e.target.value)
                }
                placeholder="Header value"
                className="flex-1 px-2.5 py-1 text-xs font-mono bg-white border border-slate-300 rounded"
              />
              <button
                type="button"
                onClick={() => removeCustomHeader(idx)}
                className="p-1.5 text-slate-400 hover:text-red-600 rounded"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Handshake Verification & Test Dispatch Console */}
      <div className="border border-slate-200 rounded-md bg-white p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              SMTP Diagnostics &amp; Live Handshake Tester
            </div>
            <div className="text-xs text-slate-500">
              Verify EHLO/STARTTLS/AUTH negotiation or dispatch a test email to inspect the full protocol transcript.
            </div>
          </div>

          <button
            type="button"
            onClick={handleRunVerify}
            disabled={verifying}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            {verifying ? 'Testing Handshake...' : 'Verify SMTP Handshake'}
          </button>
        </div>

        {/* Send Test Email Input Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-slate-200">
          <input
            type="email"
            value={testRecipient}
            onChange={(e) => setTestRecipient(e.target.value)}
            placeholder="Enter recipient email for diagnostic payload..."
            className="flex-1 px-3 py-1.5 text-xs font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:bg-white focus:border-emerald-600"
          />
          <button
            type="button"
            onClick={handleRunTestEmail}
            disabled={sendingTest || !testRecipient.trim()}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded hover:bg-emerald-700 transition-colors whitespace-nowrap flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {sendingTest
              ? 'Dispatching...'
              : 'Send Diagnostic Test Email'}
          </button>
        </div>

        {/* Protocol Transcript Output */}
        {handshakeResult && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                {handshakeResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                )}
                <span
                  className={`font-semibold ${
                    handshakeResult.ok ? 'text-emerald-800' : 'text-red-700'
                  }`}
                >
                  {handshakeResult.ok
                    ? 'ESMTP Handshake & Auth Verified'
                    : 'SMTP Handshake Diagnostic Alert'}
                </span>
              </div>
              <span className="font-mono text-slate-500 tabular-nums">
                Round-trip: {handshakeResult.durationMs}ms
              </span>
            </div>

            <div className="bg-[#0F172A] text-slate-200 p-4 rounded-md font-mono text-xs space-y-1 overflow-x-auto">
              {handshakeResult.transcript.map((line, i) => (
                <div
                  key={i}
                  className={
                    line.includes('[ERROR]')
                      ? 'text-red-400'
                      : line.startsWith('>')
                      ? 'text-indigo-300'
                      : line.startsWith('220') ||
                        line.startsWith('235') ||
                        line.startsWith('250')
                      ? 'text-emerald-400'
                      : 'text-slate-300'
                  }
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
