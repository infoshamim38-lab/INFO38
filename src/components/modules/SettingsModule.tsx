import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { GeminiService } from '../../core/gemini/GeminiService';
import { LicenseDuration, ThemeMode } from '../../types/studio';

const THEMES: ThemeMode[] = ['DARK', 'BLUE', 'RED', 'CYAN'];
const MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
const DURATIONS: LicenseDuration[] = ['1 Month', '6 Months', '1 Year', 'Lifetime'];

export const SettingsModule: React.FC = () => {
  const {
    theme,
    setTheme,
    geminiModel,
    setGeminiModel,
    geminiStatus,
    setGeminiStatus,
    geminiError,
    setGeminiError,
    extensionConnected,
    setExtensionConnected,
    outputFolder,
    setOutputFolder,
    activeLicense,
    allLicenses,
    activateLicenseKey,
    createLicense,
    revokeLicense,
  } = useStudio();

  const [licenseInput, setLicenseInput] = useState<string>('');
  const [licenseFeedback, setLicenseFeedback] = useState<string | null>(null);

  // Admin Console Auth State (Section 44: Username + Password OR Admin License Key)
  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(false);
  const [adminAuthMode, setAdminAuthMode] = useState<'credentials' | 'key'>('credentials');
  const [adminUser, setAdminUser] = useState<string>('');
  const [adminPass, setAdminPass] = useState<string>('');
  const [adminKeyInput, setAdminKeyInput] = useState<string>('');
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);

  // New License Generator State
  const [newHolder, setNewHolder] = useState<string>('');
  const [newDuration, setNewDuration] = useState<LicenseDuration>('1 Year');

  const handleTestGeminiConnection = async () => {
    setGeminiStatus('Testing');
    setGeminiError(null);
    const res = await GeminiService.testKey(geminiModel);
    if (res.connected) {
      setGeminiStatus('Connected');
      setGeminiError(null);
    } else {
      setGeminiStatus('Failed');
      setGeminiError(res.error || 'Connection Failed');
    }
  };

  const handleActivateLicense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseInput.trim()) return;
    const ok = activateLicenseKey(licenseInput);
    if (ok) {
      setLicenseFeedback('✓ License activated successfully.');
      setLicenseInput('');
    } else {
      setLicenseFeedback('✕ Invalid or revoked license key.');
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError(null);
    if (adminAuthMode === 'credentials') {
      if (adminUser.trim() === 'admin' && adminPass.trim().length >= 4) {
        setAdminUnlocked(true);
      } else {
        setAdminAuthError('Enter username "admin" and your studio administrator passphrase.');
      }
    } else {
      if (adminKeyInput.trim().toUpperCase().startsWith('SS-ADMIN')) {
        setAdminUnlocked(true);
      } else {
        setAdminAuthError('Valid Admin License Key starts with "SS-ADMIN" (e.g., SS-ADMIN-MASTER).');
      }
    }
  };

  const handleCreateLicense = (e: React.FormEvent) => {
    e.preventDefault();
    createLicense(newHolder, newDuration);
    setNewHolder('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="border-b border-[var(--border-subtle)] pb-4">
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
          SETTINGS
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Configure Appearance, Gemini Connection Test, Flow Browser Bridge, Output Directory, and Studio Licensing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. APPEARANCE (Exactly Four Themes) */}
        <div className="p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
          <div className="text-xs font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
            Appearance
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-2">
              Studio Theme (Strictly 4 Official Themes)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`py-2 px-3 rounded text-xs font-semibold border transition-colors ${
                    theme === t
                      ? 'bg-[var(--accent-primary)] text-slate-950 border-[var(--accent-primary)]'
                      : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. GEMINI CONNECTION & MODEL TEST */}
        <div className="p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              Gemini
            </span>
            <span className="text-xs font-mono text-[var(--text-secondary)]">
              Status:{' '}
              <strong
                className={
                  geminiStatus === 'Connected'
                    ? 'text-emerald-400'
                    : geminiStatus === 'Failed'
                    ? 'text-rose-400'
                    : 'text-[var(--accent-primary)]'
                }
              >
                ● {geminiStatus}
              </strong>
            </span>
          </div>

          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Active Vision & Prompt Model
            </label>
            <select
              value={geminiModel}
              onChange={(e) => setGeminiModel(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
            >
              {MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleTestGeminiConnection}
              disabled={geminiStatus === 'Testing'}
              className="px-4 py-2 rounded text-xs font-semibold bg-[var(--accent-primary)] text-slate-950 hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${geminiStatus === 'Testing' ? 'animate-spin' : ''}`}
              />
              <span>Test Connection</span>
            </button>

            {geminiStatus === 'Connected' && (
              <div className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>✓ Gemini Connected</span>
              </div>
            )}
          </div>

          {geminiStatus === 'Failed' && (
            <div className="p-3 rounded border border-rose-500/40 bg-rose-950/20 text-xs space-y-1.5">
              <div className="font-semibold text-rose-400 flex items-center gap-1">
                <XCircle className="w-4 h-4" />
                <span>✕ Connection Failed</span>
              </div>
              {geminiError && <div className="text-rose-200">{geminiError}</div>}
              <div className="text-[var(--text-muted)]">
                Check: Internet connection · API access · Model availability
              </div>
            </div>
          )}
        </div>

        {/* 3. FLOW & EXTENSION STATUS */}
        <div className="p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
          <div className="text-xs font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
            Flow
          </div>
          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">Browser Connection</span>
              <span className={extensionConnected ? 'text-emerald-400' : 'text-rose-400'}>
                {extensionConnected ? '● Connected' : '○ Disconnected'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">Extension Status</span>
              <span className="text-[var(--text-primary)]">
                SS SMART FLOW v2.0 ({extensionConnected ? 'Ready' : 'Offline'})
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExtensionConnected(!extensionConnected)}
            className="px-3 py-1.5 rounded text-xs font-medium bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]"
          >
            {extensionConnected ? 'Disconnect Bridge' : 'Reconnect Bridge'}
          </button>
        </div>

        {/* 4. OUTPUT FOLDER */}
        <div className="p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
          <div className="text-xs font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
            Output
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Output Folder
            </label>
            <input
              type="text"
              value={outputFolder}
              onChange={(e) => setOutputFolder(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
            />
          </div>
          <div className="text-[11px] font-mono text-[var(--text-muted)]">
            Subfolders: Prompts/ · Vector/ · Icons/ · Presentations/ · Flow/
          </div>
        </div>
      </div>

      {/* 5. LICENSE & ADMIN MANAGEMENT (Sections 43 & 44) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* User License Status (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
            <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)]" />
              License Status
            </span>
            <span className="text-xs font-mono text-emerald-400">
              ● {activeLicense.status}
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Plan Tier:</span>
              <span className="text-[var(--text-primary)] font-semibold">
                {activeLicense.duration}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Holder:</span>
              <span className="text-[var(--text-primary)]">{activeLicense.holder}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Expires:</span>
              <span className="text-[var(--text-primary)]">{activeLicense.expiresAt}</span>
            </div>
          </div>

          <form onSubmit={handleActivateLicense} className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
            <label className="block text-xs text-[var(--text-secondary)]">
              Switch / Activate License Key (1 Month, 6 Months, 1 Year, Lifetime)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={licenseInput}
                onChange={(e) => setLicenseInput(e.target.value)}
                placeholder="SS-STUDIO-1YR-4410-2091"
                className="flex-1 px-3 py-1.5 text-xs font-mono rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded text-xs font-semibold bg-[var(--accent-primary)] text-slate-950"
              >
                Activate
              </button>
            </div>
            {licenseFeedback && (
              <div className="text-xs font-mono text-[var(--accent-primary)]">
                {licenseFeedback}
              </div>
            )}
          </form>
        </div>

        {/* Admin License Manager (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
            <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-[var(--accent-primary)]" />
              Admin License Administration
            </span>
            {adminUnlocked && (
              <button
                type="button"
                onClick={() => setAdminUnlocked(false)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Lock Admin
              </button>
            )}
          </div>

          {!adminUnlocked ? (
            <form onSubmit={handleAdminLogin} className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAdminAuthMode('credentials')}
                  className={`px-2.5 py-1 rounded font-medium ${
                    adminAuthMode === 'credentials'
                      ? 'bg-[var(--accent-primary)] text-slate-950 font-semibold'
                      : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
                  }`}
                >
                  Username + Password
                </button>
                <button
                  type="button"
                  onClick={() => setAdminAuthMode('key')}
                  className={`px-2.5 py-1 rounded font-medium ${
                    adminAuthMode === 'key'
                      ? 'bg-[var(--accent-primary)] text-slate-950 font-semibold'
                      : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)]'
                  }`}
                >
                  Admin License Key
                </button>
              </div>

              {adminAuthMode === 'credentials' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1">
                      Admin Username
                    </label>
                    <input
                      type="text"
                      value={adminUser}
                      onChange={(e) => setAdminUser(e.target.value)}
                      placeholder="admin"
                      className="w-full px-3 py-1.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={adminPass}
                      onChange={(e) => setAdminPass(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-1.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1">
                    Admin License Key
                  </label>
                  <input
                    type="password"
                    value={adminKeyInput}
                    onChange={(e) => setAdminKeyInput(e.target.value)}
                    placeholder="SS-ADMIN-MASTER"
                    className="w-full px-3 py-1.5 font-mono rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  />
                </div>
              )}

              {adminAuthError && (
                <div className="text-rose-400">{adminAuthError}</div>
              )}

              <button
                type="submit"
                className="px-4 py-1.5 rounded font-semibold bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]"
              >
                Unlock Admin License Panel
              </button>
            </form>
          ) : (
            <div className="space-y-4 text-xs">
              <form onSubmit={handleCreateLicense} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newHolder}
                  onChange={(e) => setNewHolder(e.target.value)}
                  placeholder="License Holder Name"
                  className="px-3 py-1.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                />
                <select
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value as LicenseDuration)}
                  className="px-3 py-1.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                >
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded font-semibold bg-[var(--accent-primary)] text-slate-950"
                >
                  + Create License
                </button>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                      <th className="py-2">Key</th>
                      <th className="py-2">Holder</th>
                      <th className="py-2">Duration</th>
                      <th className="py-2">Expires</th>
                      <th className="py-2">Status</th>
                      <th className="py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-secondary)]">
                    {allLicenses.map((lic) => (
                      <tr key={lic.id}>
                        <td className="py-2 text-[var(--text-primary)]">{lic.key}</td>
                        <td className="py-2 font-sans">{lic.holder}</td>
                        <td className="py-2">{lic.duration}</td>
                        <td className="py-2">{lic.expiresAt}</td>
                        <td
                          className={`py-2 ${
                            lic.status === 'Active' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {lic.status}
                        </td>
                        <td className="py-2 text-right">
                          {lic.status === 'Active' && (
                            <button
                              type="button"
                              onClick={() => revokeLicense(lic.id)}
                              className="text-rose-400 hover:underline font-sans"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
