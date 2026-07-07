import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/AuthStore';
import { safeFetch } from '../utils/api';
import { ShieldAlert, Users, Zap, RefreshCw, Cpu, Activity, Clock, LogIn, ChevronLeft } from 'lucide-react';
import SEOMeta from '../components/SEOMeta';

interface ServerHealth {
  uptimeSeconds: number;
  memoryRssMb: number;
  memoryHeapUsedMb: number;
  databaseStatus: string;
  databasePingMs: number;
}

interface PopularMode {
  mode: string;
  count: number;
}

interface AdminStats {
  dau: number;
  totalUsers: number;
  newRegistrations: number;
  avgWpm: number;
  totalSessions: number;
  activeSessions: number;
  dbPingMs: number;
  serverHealth: ServerHealth;
  popularModes: PopularMode[];
  feedbackCount: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await safeFetch('/api/admin/stats', {
        headers: {
          Authorization: `Bearer ${token || ''}`,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Administrator credentials required.');
        }
        throw new Error('Failed to retrieve administrator metrics.');
      }

      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to the administration API.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [token]);

  const formatUptime = (sec: number) => {
    const d = Math.floor(sec / (3600 * 24));
    const h = Math.floor((sec % (3600 * 24)) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6 text-left">
      <SEOMeta
        title="Admin Telemetry Dashboard — TypeMentor AI"
        description="Internal telemetry dashboard for server stats, database performance, registrations, and WPM velocity metrics."
        canonical="/admin"
        noIndex={true}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border/30 pb-5">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/practice')}
            className="flex items-center gap-1 text-xs text-brand-primary font-bold hover:underline mb-2"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Practice Board
          </button>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-brand-warning animate-pulse" />
            Operations Dashboard
          </h1>
          <p className="text-xs text-brand-muted font-medium">
            Internal telemetry, server utilization, and registration velocities.
          </p>
        </div>

        <button
          onClick={fetchStats}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-card border border-brand-border text-xs font-bold text-white hover:bg-brand-border/35 transition-all shadow-md active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {error ? (
        <div className="glass-panel p-8 rounded-2xl border border-brand-danger/30 bg-brand-danger/5 text-center space-y-4">
          <p className="text-sm text-brand-danger font-bold">{error}</p>
          <button
            onClick={() => navigate('/practice')}
            className="px-4 py-2 rounded-xl bg-brand-card border border-brand-border text-xs font-bold text-white hover:bg-brand-border/40 transition-colors"
          >
            Return to practice
          </button>
        </div>
      ) : isLoading && !stats ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-brand-muted font-bold uppercase tracking-widest">Loading Telemetry...</p>
          </div>
        </div>
      ) : stats ? (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* ── 1. Telemetry Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-brand-border/40 space-y-3">
              <div className="flex justify-between items-center text-brand-muted">
                <span className="text-[10px] uppercase font-bold tracking-wider">Active Users Today</span>
                <Users className="w-4 h-4 text-brand-primary" />
              </div>
              <div>
                <span className="text-2xl font-black text-white font-mono">{stats.dau}</span>
                <span className="text-[10px] text-brand-muted block mt-1">
                  Out of {stats.totalUsers} total registered users
                </span>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-brand-border/40 space-y-3">
              <div className="flex justify-between items-center text-brand-muted">
                <span className="text-[10px] uppercase font-bold tracking-wider">7-Day New Registrations</span>
                <LogIn className="w-4 h-4 text-brand-warning" />
              </div>
              <div>
                <span className="text-2xl font-black text-white font-mono">+{stats.newRegistrations}</span>
                <span className="text-[10px] text-brand-muted block mt-1">
                  New student/developer accounts
                </span>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-brand-border/40 space-y-3">
              <div className="flex justify-between items-center text-brand-muted">
                <span className="text-[10px] uppercase font-bold tracking-wider">Global Average Speed</span>
                <Zap className="w-4 h-4 text-brand-success" />
              </div>
              <div>
                <span className="text-2xl font-black text-white font-mono">{stats.avgWpm} WPM</span>
                <span className="text-[10px] text-brand-muted block mt-1">
                  Across {stats.totalSessions} typing sessions
                </span>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-brand-border/40 space-y-3">
              <div className="flex justify-between items-center text-brand-muted">
                <span className="text-[10px] uppercase font-bold tracking-wider">Db Latency</span>
                <Activity className="w-4 h-4 text-brand-success" />
              </div>
              <div>
                <span className="text-2xl font-black text-white font-mono">{stats.dbPingMs} ms</span>
                <span className="text-[10px] text-brand-muted block mt-1">
                  Database query round-trip
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── 2. Server Health Telemetry ── */}
            <div className="glass-panel p-6 rounded-3xl border border-brand-border/40 lg:col-span-2 space-y-5">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-brand-border/30 pb-3">
                <Cpu className="w-4 h-4 text-brand-primary" />
                Server Health & Node Telemetry
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border/30">
                  <span className="text-[9px] text-brand-muted uppercase font-bold block">Uptime</span>
                  <span className="text-sm font-bold text-white block mt-1 font-mono">
                    {formatUptime(stats.serverHealth.uptimeSeconds)}
                  </span>
                </div>
                <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border/30">
                  <span className="text-[9px] text-brand-muted uppercase font-bold block">Memory RSS</span>
                  <span className="text-sm font-bold text-white block mt-1 font-mono">
                    {stats.serverHealth.memoryRssMb} MB
                  </span>
                </div>
                <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border/30">
                  <span className="text-[9px] text-brand-muted uppercase font-bold block">Memory Heap Used</span>
                  <span className="text-sm font-bold text-white block mt-1 font-mono">
                    {stats.serverHealth.memoryHeapUsedMb} MB
                  </span>
                </div>
                <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border/30">
                  <span className="text-[9px] text-brand-muted uppercase font-bold block">Active Sessions (1h)</span>
                  <span className="text-sm font-bold text-brand-warning block mt-1 font-mono">
                    {stats.activeSessions} active
                  </span>
                </div>
              </div>
            </div>

            {/* ── 3. Popular Practices ── */}
            <div className="glass-panel p-6 rounded-3xl border border-brand-border/40 space-y-5">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-brand-border/30 pb-3">
                <Clock className="w-4 h-4 text-brand-warning" />
                Popular Modes & Lessons
              </h2>
              <div className="space-y-4">
                {stats.popularModes.length === 0 ? (
                  <p className="text-xs text-brand-muted">No session logs recorded yet.</p>
                ) : (
                  stats.popularModes.map((item) => (
                    <div key={item.mode} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-white">{item.mode}</span>
                        <span className="text-brand-muted">{item.count} sessions</span>
                      </div>
                      <div className="w-full bg-brand-card rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-brand-primary h-full rounded-full"
                          style={{
                            width: `${Math.min(100, Math.round((item.count / stats.totalSessions) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
