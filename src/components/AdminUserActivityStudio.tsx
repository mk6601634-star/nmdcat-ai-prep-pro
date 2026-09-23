import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  Activity,
  UserCheck,
  UserX,
  Globe,
  Smartphone,
  Laptop,
  ChevronRight,
  X,
  Calendar,
  Key,
  ShieldAlert,
  ArrowUpDown,
  Radio
} from 'lucide-react';
import { AuthUserSummary, AuthLoginEvent, UserPresenceRecord } from '../types';

export interface AdminUserActivityStudioProps {
  currentUserToken?: string;
  serverRole: 'super_admin' | 'admin' | 'user' | null;
}

export const AdminUserActivityStudio: React.FC<AdminUserActivityStudioProps> = ({
  currentUserToken,
  serverRole
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'all_users' | 'online_now' | 'login_history'>('all_users');
  
  // Data states
  const [users, setUsers] = useState<AuthUserSummary[]>([]);
  const [loginEvents, setLoginEvents] = useState<AuthLoginEvent[]>([]);
  const [presenceList, setPresenceList] = useState<UserPresenceRecord[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [providerFilter, setProviderFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'last_signin_desc' | 'last_signin_asc' | 'created_desc'>('last_signin_desc');

  // Selected User Detail Modal
  const [selectedUser, setSelectedUser] = useState<AuthUserSummary | null>(null);
  const [selectedUserActivity, setSelectedUserActivity] = useState<{
    presence: UserPresenceRecord | null;
    recentLogins: AuthLoginEvent[];
    totalLoginEvents: number;
  } | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);

  // Fetch all user activity data
  const fetchData = async (showLoadingSpinner = true) => {
    if (!currentUserToken) return;
    if (showLoadingSpinner) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const [usersRes, eventsRes, presenceRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${currentUserToken}` } }),
        fetch('/api/admin/login-events?limit=200', { headers: { 'Authorization': `Bearer ${currentUserToken}` } }),
        fetch('/api/admin/presence', { headers: { 'Authorization': `Bearer ${currentUserToken}` } })
      ]);

      if (!usersRes.ok || !eventsRes.ok || !presenceRes.ok) {
        throw new Error('Failed to load user activity data from server.');
      }

      const usersData = await usersRes.json();
      const eventsData = await eventsRes.json();
      const presenceData = await presenceRes.json();

      setUsers(usersData.users || []);
      setLoginEvents(eventsData.events || []);
      setPresenceList(presenceData.onlineUsers ? [...presenceData.onlineUsers, ...(presenceData.recentlyActiveUsers || [])] : []);
    } catch (err: any) {
      console.error('[AdminUserActivityStudio] Error fetching activity:', err);
      setError(err?.message || 'Error communicating with Admin API');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    // Poll every 30 seconds for live presence
    const timer = setInterval(() => {
      fetchData(false);
    }, 30000);
    return () => clearInterval(timer);
  }, [currentUserToken]);

  // Load detailed user activity
  const handleOpenUserDetail = async (user: AuthUserSummary) => {
    setSelectedUser(user);
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.uid)}/activity`, {
        headers: { 'Authorization': `Bearer ${currentUserToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedUserActivity({
          presence: data.presence || null,
          recentLogins: data.recentLogins || [],
          totalLoginEvents: data.totalLoginEvents || 0
        });
      }
    } catch (e) {
      console.warn('Failed to load user activity detail:', e);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Filtered & Sorted Users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (u.email && u.email.toLowerCase().includes(q)) || 
        (u.displayName && u.displayName.toLowerCase().includes(q)) ||
        (u.uid && u.uid.toLowerCase().includes(q));

      const matchesProvider = providerFilter === 'ALL' || 
        (u.providers && u.providers.some(p => p.toLowerCase().includes(providerFilter.toLowerCase())));

      const matchesStatus = statusFilter === 'ALL' || 
        (statusFilter === 'ONLINE' && u.isOnline) ||
        (statusFilter === 'OFFLINE' && !u.isOnline);

      return matchesSearch && matchesProvider && matchesStatus;
    }).sort((a, b) => {
      if (sortOrder === 'last_signin_desc') {
        return new Date(b.lastSignInTime || 0).getTime() - new Date(a.lastSignInTime || 0).getTime();
      } else if (sortOrder === 'last_signin_asc') {
        return new Date(a.lastSignInTime || 0).getTime() - new Date(b.lastSignInTime || 0).getTime();
      } else {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });
  }, [users, searchQuery, providerFilter, statusFilter, sortOrder]);

  // Online Users List
  const onlineUsers = useMemo(() => {
    return users.filter(u => u.isOnline);
  }, [users]);

  // Filtered Login Events
  const filteredEvents = useMemo(() => {
    return loginEvents.filter(e => {
      const q = searchQuery.toLowerCase().trim();
      return !q || 
        (e.email && e.email.toLowerCase().includes(q)) ||
        (e.displayName && e.displayName.toLowerCase().includes(q)) ||
        (e.uid && e.uid.toLowerCase().includes(q));
    });
  }, [loginEvents, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>User Directory & Live Activity Console</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                  Firebase Auth & Firestore
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Audited Firebase user accounts, real-time online presence, and chronological session login history.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Refresh */}
        <div className="flex items-center gap-2 self-stretch md:self-auto">
          <button
            onClick={() => fetchData(false)}
            disabled={isRefreshing || isLoading}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh Live Data</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 font-medium block">Total Registered Accounts</span>
            <span className="text-2xl font-black text-white mt-1 block">{users.length}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 font-medium block">Currently Online (2m heartbeat)</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-400">{onlineUsers.length}</span>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Radio className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 font-medium block">Historical Session Logins</span>
            <span className="text-2xl font-black text-cyan-400 mt-1 block">{loginEvents.length}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveSubTab('all_users')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'all_users'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>All Users ({users.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('online_now')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'online_now'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Online Now ({onlineUsers.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('login_history')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'login_history'
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Login History ({loginEvents.length})</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search email, name, UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* TAB 1: ALL USERS DIRECTORY */}
        {activeSubTab === 'all_users' && (
          <div className="space-y-4">
            {/* Filter controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Provider:</span>
                <select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 px-2.5 py-1 rounded-lg focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">All Providers</option>
                  <option value="google">Google</option>
                  <option value="anonymous">Anonymous</option>
                </select>

                <span className="text-slate-400 font-medium ml-2">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 px-2.5 py-1 rounded-lg focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="ONLINE">Online</option>
                  <option value="OFFLINE">Offline</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Sort:</span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 px-2.5 py-1 rounded-lg focus:outline-none focus:border-cyan-500"
                >
                  <option value="last_signin_desc">Latest Sign-In</option>
                  <option value="last_signin_asc">Oldest Sign-In</option>
                  <option value="created_desc">Account Created</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Loading complete user directory...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs bg-slate-950/50 rounded-2xl border border-slate-800">
                No users match the search and filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3.5">User Identity</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">Provider</th>
                      <th className="p-3.5">Account Created</th>
                      <th className="p-3.5">Last Sign-in</th>
                      <th className="p-3.5">Live Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {filteredUsers.map((user) => {
                      const isSuperAdmin = user.role === 'super_admin' || user.email?.toLowerCase() === 'mdcatquizbymehran@gmail.com';
                      return (
                        <tr key={user.uid} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center shrink-0 ${
                                isSuperAdmin ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-cyan-300'
                              }`}>
                                {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : (user.email ? user.email.slice(0, 2).toUpperCase() : 'US')}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-white block truncate">{user.displayName || 'NMDCAT Student'}</span>
                                <span className="text-slate-400 block text-[11px] truncate">{user.email || 'Anonymous Student'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className={`font-bold px-2 py-0.5 rounded text-[10px] border ${
                              isSuperAdmin
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : user.role === 'admin'
                                ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}>
                              {isSuperAdmin ? 'Super Admin' : (user.role === 'admin' ? 'Admin' : 'Student')}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className="text-slate-300 font-mono text-[11px]">
                              {user.providers && user.providers.length > 0 ? user.providers.join(', ') : 'google.com'}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="p-3.5 text-slate-300 font-mono text-[11px]">
                            {user.lastSignInTime ? new Date(user.lastSignInTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          </td>
                          <td className="p-3.5">
                            {user.isOnline ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span>Online</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-medium text-[10px]">
                                <span>Offline</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => handleOpenUserDetail(user)}
                              className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 rounded-lg border border-cyan-500/30 text-[11px] font-bold transition-all cursor-pointer"
                            >
                              View Detail
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ONLINE NOW */}
        {activeSubTab === 'online_now' && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 text-emerald-300">
                <Radio className="w-4 h-4 animate-pulse" />
                <span className="font-semibold">
                  Live presence detected based on heartbeat received within the last 2 minutes.
                </span>
              </div>
              <span className="font-bold text-emerald-400">{onlineUsers.length} Active Now</span>
            </div>

            {onlineUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs bg-slate-950/50 rounded-2xl border border-slate-800">
                No active users online at this moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {onlineUsers.map(user => (
                  <div key={user.uid} className="p-4 bg-slate-950 rounded-2xl border border-emerald-500/20 space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full pointer-events-none"></div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center shrink-0 border border-emerald-500/30">
                          {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : 'ON'}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-white block truncate">{user.displayName || 'NMDCAT Student'}</span>
                          <span className="text-slate-400 block text-[11px] truncate">{user.email || 'Anonymous'}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 shrink-0 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Active
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[11px] text-slate-400">
                      <div className="flex justify-between">
                        <span>Last Heartbeat:</span>
                        <span className="text-slate-200 font-mono">
                          {user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleTimeString() : 'Just now'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Role:</span>
                        <span className="text-cyan-300 font-bold">{user.role}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenUserDetail(user)}
                      className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                    >
                      Inspect Activity
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LOGIN HISTORY */}
        {activeSubTab === 'login_history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Chronological immutable audit log of verified login sessions.</span>
              <span className="text-slate-400 font-mono">Showing latest {filteredEvents.length} events</span>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs bg-slate-950/50 rounded-2xl border border-slate-800">
                No login events found.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3.5">Timestamp</th>
                      <th className="p-3.5">User Account</th>
                      <th className="p-3.5">Provider</th>
                      <th className="p-3.5">Method</th>
                      <th className="p-3.5">Platform</th>
                      <th className="p-3.5 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {filteredEvents.map((evt) => (
                      <tr key={evt.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-mono text-slate-300 text-[11px]">
                          {evt.loginAt ? new Date(evt.loginAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A'}
                        </td>
                        <td className="p-3.5">
                          <div className="min-w-0">
                            <span className="font-bold text-white block truncate">{evt.displayName || evt.email || evt.uid}</span>
                            <span className="text-slate-400 block text-[11px] truncate">{evt.email || evt.uid}</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[10px] font-bold">
                            {evt.provider}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-400 text-[11px]">{evt.loginMethod}</td>
                        <td className="p-3.5 text-slate-400 text-[11px]">{evt.platform || 'web'}</td>
                        <td className="p-3.5 text-right">
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Success</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* USER DETAIL MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 font-bold flex items-center justify-center border border-cyan-500/20 text-base">
                  {selectedUser.displayName ? selectedUser.displayName.slice(0, 2).toUpperCase() : 'US'}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{selectedUser.displayName || 'NMDCAT Student'}</h3>
                  <span className="text-xs text-slate-400">{selectedUser.email || 'Anonymous Student'}</span>
                </div>
              </div>
              <button
                onClick={() => { setSelectedUser(null); setSelectedUserActivity(null); }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Account Metadata Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div>
                <span className="text-slate-400 block text-[11px]">Role</span>
                <span className="font-bold text-cyan-300">{selectedUser.role}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Provider</span>
                <span className="font-bold text-white font-mono">{selectedUser.providers?.join(', ') || 'google.com'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Current Status</span>
                <span className={`font-bold ${selectedUser.isOnline ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {selectedUser.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Email Verified</span>
                <span className="font-bold text-white">{selectedUser.emailVerified ? 'Yes' : 'No'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Account Created</span>
                <span className="font-mono text-slate-300 text-[11px]">
                  {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Last Sign-In</span>
                <span className="font-mono text-slate-300 text-[11px]">
                  {selectedUser.lastSignInTime ? new Date(selectedUser.lastSignInTime).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            {/* UID Badge */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span><strong>UID:</strong> {selectedUser.uid}</span>
            </div>

            {/* Recent Login History */}
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Recent Login History</span>
              </h4>

              {isLoadingDetail ? (
                <div className="py-6 text-center text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Loading user login events...</span>
                </div>
              ) : selectedUserActivity?.recentLogins && selectedUserActivity.recentLogins.length > 0 ? (
                <div className="space-y-2">
                  {selectedUserActivity.recentLogins.map(login => (
                    <div key={login.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <div>
                          <span className="font-mono text-slate-200 block text-[11px]">
                            {new Date(login.loginAt).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-500">Method: {login.loginMethod} &bull; {login.platform || 'web'}</span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded font-mono">
                        {login.provider}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-slate-500 bg-slate-950 rounded-xl border border-slate-800 text-[11px]">
                  No recorded historical login events for this user.
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => { setSelectedUser(null); setSelectedUserActivity(null); }}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
