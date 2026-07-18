import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Clock, User } from 'lucide-react';
import dayjs from 'dayjs';
import { STAFF_SESSION_IDLE_TIMEOUT_MS } from '@/lib/staffSessionService';

export function UserLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let { data, error } = await supabase
        .from('user_sessions')
        .select(`
          id,
          login_time,
          logout_time,
          logout_reason,
          users (
            name,
            email,
            role
          )
        `)
        .order('login_time', { ascending: false })
        .limit(100);

      if (error && String(error.message).includes('logout_reason')) {
        const fallback = await supabase
          .from('user_sessions')
          .select(`
            id,
            login_time,
            logout_time,
            users (
              name,
              email,
              role
            )
          `)
          .order('login_time', { ascending: false })
          .limit(100);
        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching user logs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Login Logs</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track staff login and logout activity across the system.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Refresh Logs
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Staff Member</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Login Time</th>
                <th className="px-6 py-4 font-semibold">Logout Time</th>
                <th className="px-6 py-4 font-semibold">Session Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Loading logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No login logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const loginAt = dayjs(log.login_time);
                  const logoutReason = log.logout_reason as string | null;
                  const expiredByReason = logoutReason === 'expired';
                  const hasExpired =
                    expiredByReason ||
                    (!log.logout_time && dayjs().diff(loginAt, 'millisecond') > STAFF_SESSION_IDLE_TIMEOUT_MS);
                  const effectiveEnd = log.logout_time
                    ? dayjs(log.logout_time)
                    : hasExpired
                      ? loginAt.add(STAFF_SESSION_IDLE_TIMEOUT_MS, 'millisecond')
                      : null;
                  const duration = effectiveEnd ? effectiveEnd.diff(loginAt, 'minute') : null;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{log.users?.name || 'Unknown'}</div>
                            <div className="text-xs text-slate-500">{log.users?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {log.users?.role || 'Staff'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {dayjs(log.login_time).format('MMM D, YYYY h:mm A')}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {log.logout_time ? (
                          <span className={expiredByReason ? 'text-amber-600 font-medium' : undefined}>
                            {dayjs(log.logout_time).format('MMM D, YYYY h:mm A')}
                            {expiredByReason ? ' (expired)' : ''}
                          </span>
                        ) : hasExpired ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                            Session expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Active Now
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {duration !== null ? (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Clock className="w-4 h-4" />
                            {duration < 60 ? `${duration}m` : `${Math.floor(duration / 60)}h ${duration % 60}m`}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Loading logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No login logs found.
            </div>
          ) : (
            logs.map((log) => {
              const loginAt = dayjs(log.login_time);
              const logoutReason = log.logout_reason as string | null;
              const expiredByReason = logoutReason === 'expired';
              const hasExpired =
                expiredByReason ||
                (!log.logout_time && dayjs().diff(loginAt, 'millisecond') > STAFF_SESSION_IDLE_TIMEOUT_MS);
              const effectiveEnd = log.logout_time
                ? dayjs(log.logout_time)
                : hasExpired
                  ? loginAt.add(STAFF_SESSION_IDLE_TIMEOUT_MS, 'millisecond')
                  : null;
              const duration = effectiveEnd ? effectiveEnd.diff(loginAt, 'minute') : null;

              return (
                <div key={log.id} className="p-4 bg-white hover:bg-slate-50/50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <div className="font-bold text-slate-900 text-sm">{log.users?.name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{log.users?.email}</div>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                      {log.users?.role || 'Staff'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="font-semibold">Login:</span>
                      <span>{dayjs(log.login_time).format('MMM D, YYYY h:mm A')}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="font-semibold">Logout:</span>
                      <span>
                        {log.logout_time ? (
                          <span className={expiredByReason ? 'text-amber-600 font-bold' : undefined}>
                            {dayjs(log.logout_time).format('MMM D, YYYY h:mm A')}
                            {expiredByReason ? ' (expired)' : ''}
                          </span>
                        ) : hasExpired ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 font-bold">
                            Session expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Active Now
                          </span>
                        )}
                      </span>
                    </div>
                    {duration !== null && (
                      <div className="flex justify-between items-center text-slate-600 pt-2 border-t border-slate-50 mt-1">
                        <span className="font-semibold">Duration:</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {duration < 60 ? `${duration}m` : `${Math.floor(duration / 60)}h ${duration % 60}m`}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
