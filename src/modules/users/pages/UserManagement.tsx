import React, { useEffect, useState } from 'react';
import { useUserStore } from '../store/useUserStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Users, Plus, Shield, ShieldAlert, ShieldCheck, Mail, CheckCircle2, XCircle, Trash2, Store } from 'lucide-react';
import {
  OUTLET_SCOPED_ROLES,
  Role,
  SUPER_ADMIN_ASSIGNABLE_ROLES,
  TENANT_ADMIN_ASSIGNABLE_ROLES,
  type RoleType,
} from '@/constants';
import { PERMISSIONS, ROLE_ACCESS_SUMMARIES } from '@/constants/permissions';
import { useHasPermission } from '@/hooks/useHasPermission';

export function UserManagement() {
  const { user } = useAuthStore();
  const canManageUsers = useHasPermission(PERMISSIONS.USERS_MANAGE);
  const { users, outlets, isLoading, error, fetchUsers, fetchOutlets, addUser, toggleUserStatus, deleteUser } = useUserStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: Role.CASHIER,
    outlet_id: '',
    password: '',
  });
  const roleOptions = user?.role === Role.SUPER_ADMIN
    ? SUPER_ADMIN_ASSIGNABLE_ROLES
    : TENANT_ADMIN_ASSIGNABLE_ROLES;
  const selectedRoleNeedsOutlet = OUTLET_SCOPED_ROLES.includes(formData.role);

  useEffect(() => {
    fetchUsers();
    fetchOutlets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || formData.password.length < 6) return;

    await addUser(formData, formData.password);
    setIsModalOpen(false);
    setFormData({ name: '', email: '', role: Role.CASHIER, outlet_id: '', password: '' });
  };

  if (!canManageUsers) {
    return (
      <div className="p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl p-8 max-w-lg mx-auto shadow-sm">
          <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p>You do not have permission to view or manage staff accounts.</p>
        </div>
      </div>
    );
  }

  const getRoleIcon = (role: RoleType) => {
    switch (role) {
      case Role.SUPER_ADMIN: return <ShieldCheck className="w-4 h-4 text-red-500" />;
      case Role.ADMIN: return <Shield className="w-4 h-4 text-orange-500" />;
      case Role.OUTLET_OWNER:
      case Role.OUTLET_MANAGER: return <Store className="w-4 h-4 text-blue-500" />;
      default: return <Users className="w-4 h-4 text-slate-500" />;
    }
  };

  const getRoleBadgeColor = (role: RoleType) => {
    switch (role) {
      case Role.SUPER_ADMIN: return 'bg-red-50 text-red-700 border-red-200';
      case Role.ADMIN: return 'bg-orange-50 text-orange-700 border-orange-200';
      case Role.OUTLET_OWNER:
      case Role.OUTLET_MANAGER: return 'bg-blue-50 text-blue-700 border-blue-200';
      case Role.CASHIER: return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case Role.KITCHEN_STAFF: return 'bg-amber-50 text-amber-700 border-amber-200';
      case Role.INVENTORY_STAFF: return 'bg-violet-50 text-violet-700 border-violet-200';
      case Role.ACCOUNTANT: return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-orange-600" />
            Staff & User Management
          </h1>
          <p className="text-slate-500 text-sm">Create and manage accounts for your cafe network</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/erp/users/logs"
            className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            View Login Logs
          </a>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add Staff
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 font-medium">Loading staff accounts...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 font-medium">{error}</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700">No Staff Setup</h3>
            <p className="text-slate-500 mb-6">Start by adding your first cashier or manager.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg font-medium hover:bg-orange-200 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Staff
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="px-6 py-4 font-semibold">User</th>
                    <th className="px-6 py-4 font-semibold">Role</th>
                    <th className="px-6 py-4 font-semibold">Assigned Branch</th>
                    <th className="px-6 py-4 font-semibold text-center">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{u.name}</div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <Mail className="w-3.5 h-3.5" />
                          {u.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${getRoleBadgeColor(u.role)}`}>
                          {getRoleIcon(u.role)}
                          {u.role}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {u.outlet ? (
                          <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                            <Store className="w-4 h-4 text-slate-400" />
                            {u.outlet.name}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-sm">All Branches (HQ)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {u.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {u.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => toggleUserStatus(u.id, u.is_active)}
                          className={`text-sm font-medium px-3 py-1.5 rounded transition-colors ${
                            u.is_active
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {u.is_active ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                          onClick={() => {
                            if(confirm('Are you sure you want to delete this user?')) {
                              deleteUser(u.id);
                            }
                          }}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex flex-col divide-y divide-slate-100">
              {users.map((u) => (
                <div key={u.id} className="p-4 bg-white hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-1">
                      <div className="font-bold text-slate-800 text-base">{u.name}</div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Mail className="w-3.5 h-3.5" />
                        {u.email}
                      </div>
                    </div>
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold ${getRoleBadgeColor(u.role)}`}>
                      {getRoleIcon(u.role)}
                      {u.role}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm mb-4">
                    <div className="text-slate-600">
                      {u.outlet ? (
                        <div className="flex items-center gap-1.5 font-medium">
                          <Store className="w-4 h-4 text-slate-400" />
                          {u.outlet.name}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">All Branches (HQ)</span>
                      )}
                    </div>
                    <div>
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {u.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-50">
                    <button
                      onClick={() => toggleUserStatus(u.id, u.is_active)}
                      className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded transition-colors ${
                        u.is_active
                          ? 'text-amber-600 bg-amber-50'
                          : 'text-green-600 bg-green-50'
                      }`}
                    >
                      {u.is_active ? 'Suspend' : 'Activate'}
                    </button>
                    <button
                      onClick={() => {
                        if(confirm('Are you sure you want to delete this user?')) {
                          deleteUser(u.id);
                        }
                      }}
                      className="text-red-500 bg-red-50 p-1.5 rounded transition-colors"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Add New Staff</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">x</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Jane Doe"
                  className="w-full border-slate-200 rounded-lg focus:ring-orange-600 focus:border-orange-600 shadow-sm"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  required
                  type="email"
                  placeholder="e.g. jane@cafepilot.com"
                  className="w-full border-slate-200 rounded-lg focus:ring-orange-600 focus:border-orange-600 shadow-sm"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Temporary Password *</label>
                <input
                  required
                  minLength={6}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Minimum 6 characters"
                  className="w-full border-slate-200 rounded-lg focus:ring-orange-600 focus:border-orange-600 shadow-sm"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Role *</label>
                <select
                  className="w-full border-slate-200 rounded-lg focus:ring-orange-600 focus:border-orange-600 shadow-sm"
                  value={formData.role}
                  onChange={e => {
                    const role = e.target.value as RoleType;
                    setFormData({
                      ...formData,
                      role,
                      outlet_id: OUTLET_SCOPED_ROLES.includes(role) ? formData.outlet_id : '',
                    });
                  }}
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  {ROLE_ACCESS_SUMMARIES[formData.role]}
                </p>
              </div>

              {/* Show branch selector only if they are not Super Admin/Admin */}
              {selectedRoleNeedsOutlet && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Assign to Branch *</label>
                  <select
                    required
                    className="w-full border-slate-200 rounded-lg focus:ring-orange-600 focus:border-orange-600 shadow-sm"
                    value={formData.outlet_id}
                    onChange={e => setFormData({...formData, outlet_id: e.target.value})}
                  >
                    <option value="" disabled>Select a branch...</option>
                    {outlets.map(o => (
                      <option key={o.id} value={o.id}>{o.name} ({o.location})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
