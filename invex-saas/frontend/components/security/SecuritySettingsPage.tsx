'use client';
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Eye, Fingerprint, Lock, Trash2,
  Download, AlertTriangle, CheckCircle2, Loader2,
  ClipboardList, ToggleLeft, ToggleRight
} from 'lucide-react';
import { getStoredUser } from '@/lib/auth';

// Uses relative path — proxied to backend via next.config.mjs rewrites
const API = '/api/v1';

// ─── sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, children }: {
  title: string; icon: React.ComponentType<any>; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <Icon className="w-5 h-5 text-indigo-600" />
        </div>
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function StatusBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    LOW: "bg-emerald-100 text-emerald-700",
    MEDIUM: "bg-amber-100 text-amber-700",
    HIGH: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colors[level] ?? colors.LOW}`}>
      {level}
    </span>
  );
}

// ─── page ──────────────────────────────────────────────────────────────────────

export const SecuritySettingsPage: React.FC = () => {
  const storedUser = getStoredUser();
  const userId = storedUser?.id ?? '0000-user';

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [consent, setConsent] = useState({ marketing: true, analytics: true, third_party: false });
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetch(`${API}/security/audit-log/${userId}`)
      .then(r => r.json())
      .then(d => setAuditLogs(d.logs ?? []))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    fetch(`${API}/security/device/check/${userId}`, { method: 'POST' })
      .then(r => r.json())
      .then(setDeviceInfo)
      .catch(() => {});
  }, [userId]);

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const res = await fetch(`${API}/compliance/export/${userId}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invex-data-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      notify('Your data has been exported successfully.');
    } catch {
      notify('Export failed. Please try again.', false);
    } finally {
      setExportLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteReason.trim()) { notify('Please enter a reason.', false); return; }
    setDeleteLoading(true);
    try {
      await fetch(`${API}/compliance/delete/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deleteReason }),
      });
      notify('Account data anonymized per DPDP Act 2023. You will be logged out shortly.');
      setShowDeleteConfirm(false);
    } catch {
      notify('Deletion failed. Please try again.', false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleConsentToggle = async (type: string, value: boolean) => {
    const updated = { ...consent, [type]: value };
    setConsent(updated);
    try {
      await fetch(`${API}/compliance/consent/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent_type: type, granted: value }),
      });
      notify(`${type} consent ${value ? 'enabled' : 'revoked'}.`);
    } catch {
      notify('Failed to update consent.', false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 pb-24">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white font-medium text-sm transition-all ${toast.ok ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-indigo-600" /> Security &amp; Privacy
        </h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account security, data rights, and privacy preferences.</p>
      </div>

      <SectionCard title="Device Trust" icon={Fingerprint}>
        {deviceInfo ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className={`w-3 h-3 rounded-full ${deviceInfo.is_new_device ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {deviceInfo.is_new_device ? '⚠️ Unrecognized Device Detected' : '✅ Recognized Device'}
                </p>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{deviceInfo.device_id?.substring(0, 32)}…</p>
              </div>
            </div>
            {deviceInfo.warning && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                {deviceInfo.warning}
              </div>
            )}
          </div>
        ) : (
          <div className="h-16 flex items-center justify-center text-gray-400 text-sm animate-pulse">Checking device…</div>
        )}
      </SectionCard>

      <SectionCard title="Trade Confirmation (2FA)" icon={Lock}>
        <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-50 border border-indigo-100">
          <div>
            <p className="font-semibold text-gray-900 text-sm">OTP for High-Value Trades</p>
            <p className="text-xs text-gray-500 mt-0.5">Trades ≥ ₹1 Lakh require OTP confirmation (via SMS or email).</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" /> Enabled
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Data Consent (DPDP Act §6)" icon={ToggleRight}>
        <div className="space-y-4">
          {[
            { key: 'marketing', label: 'Marketing & Personalization', desc: 'Allow Invex to send tailored investment insights and offers.' },
            { key: 'analytics', label: 'Usage Analytics', desc: 'Help us improve the platform by sharing anonymous usage data.' },
            { key: 'third_party', label: 'Third-Party Data Sharing', desc: 'Allow partner integrations (e.g. broker APIs) to access portfolio summary.' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
              <div>
                <p className="text-sm font-semibold text-gray-800">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
              <button
                onClick={() => handleConsentToggle(key, !consent[key as keyof typeof consent])}
                className="shrink-0"
              >
                {consent[key as keyof typeof consent]
                  ? <ToggleRight className="w-8 h-8 text-indigo-600" />
                  : <ToggleLeft className="w-8 h-8 text-gray-400" />}
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Security Audit Log" icon={ClipboardList}>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No security events recorded yet.</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {auditLogs.map((log: any) => (
              <div key={log.id} className="flex items-start justify-between gap-3 p-3 border border-gray-50 bg-gray-50/60 rounded-lg text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{log.action.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{log.ip_address} · {log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : '—'}</p>
                </div>
                <StatusBadge level={log.risk_level ?? 'LOW'} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Your Data Rights (DPDP Act 2023)" icon={Eye}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-1">📦 Export My Data</p>
            <p className="text-xs text-gray-500 mb-3">Download everything Invex holds about you as a JSON file.</p>
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {exportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export Data
            </button>
          </div>

          <div>
            <p className="text-sm font-semibold text-red-700 mb-1">🗑️ Delete My Account</p>
            <p className="text-xs text-gray-500 mb-3">Anonymizes all PII per the DPDP Act. This action is irreversible.</p>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Request Deletion
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  placeholder="Reason for deletion…"
                  className="w-full text-sm px-3 py-2 border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
                  >
                    {deleteLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Confirm
                  </button>
                  <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
};
