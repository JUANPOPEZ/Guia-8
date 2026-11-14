import React, { useCallback, useEffect, useState } from 'react';
import { X, Activity, ShieldAlert, RefreshCw, Lock } from 'lucide-react';
import { AdminMetrics } from '../types';

interface AdminMetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  authToken: string | null;
  onOpenAuth: () => void;
}

export const AdminMetricsModal: React.FC<AdminMetricsModalProps> = ({
  isOpen,
  onClose,
  authToken,
  onOpenAuth,
}) => {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMetrics(null);
    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }
      const res = await fetch('/api/admin/security-audit', { headers });
      const json = (await res.json()) as {
        success?: boolean;
        data?: AdminMetrics;
        error?: string;
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || `HTTP Error ${res.status}`);
      }
      setMetrics(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to retrieve security audit metrics.');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (isOpen) {
      void fetchMetrics();
    }
  }, [isOpen, fetchMetrics]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Security Audit & Admin Telemetry (GET /api/admin/security-audit)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Restricted to ADMIN role (OWASP A01 & A09)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void fetchMetrics();
              }}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              title="Refresh security metrics"
              aria-label="Refresh security metrics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close security audit modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {loading && (
            <div className="py-10 text-center text-xs text-slate-500">
              Querying server security audit telemetry...
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 space-y-3">
              <div className="flex items-start gap-2.5 text-xs sm:text-sm font-medium">
                <Lock className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Access Restricted by JWT / RBAC</p>
                  <p className="mt-0.5 opacity-90">{error}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Sign In as ADMIN
              </button>
            </div>
          )}

          {metrics && (
            <>
              {/* Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                    Total API Requests
                  </span>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {metrics.totalRequests}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900">
                  <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold">
                    ADMIN / USER Requests
                  </span>
                  <p className="text-xl font-extrabold text-indigo-900 dark:text-indigo-100 mt-0.5">
                    {metrics.requestsByRole.ADMIN} / {metrics.requestsByRole.USER}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                  <span className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
                    Blocked 401 / 403
                  </span>
                  <p className="text-xl font-extrabold text-amber-900 dark:text-amber-100 mt-0.5">
                    {metrics.securityEvents.unauthorized401} / {metrics.securityEvents.forbidden403}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
                    Logins OK / Failed
                  </span>
                  <p className="text-xl font-extrabold text-emerald-900 dark:text-emerald-100 mt-0.5">
                    {metrics.securityEvents.loginSuccess} / {metrics.securityEvents.loginFailure}
                  </p>
                </div>
              </div>

              {/* Recent Audit Logs */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <ShieldAlert className="w-3.5 h-3.5 text-violet-500" />
                  <span>Recent Security Audit Log (OWASP A09 – No Sensitive Data)</span>
                </div>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Time (UTC)</th>
                        <th className="px-3 py-2 font-semibold">Method</th>
                        <th className="px-3 py-2 font-semibold">Path</th>
                        <th className="px-3 py-2 font-semibold">Role</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {metrics.recentAuditLogs.map((log, i) => (
                        <tr key={`${log.timestamp}-${i}`} className="text-slate-700 dark:text-slate-300">
                          <td className="px-3 py-2 font-mono text-[11px]">
                            {log.timestamp.slice(11, 19)}
                          </td>
                          <td className="px-3 py-2 font-bold">{log.method}</td>
                          <td className="px-3 py-2 font-mono">{log.path}</td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                              {log.role}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono font-bold">
                            <span
                              className={
                                log.statusCode >= 400
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }
                            >
                              {log.statusCode}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
