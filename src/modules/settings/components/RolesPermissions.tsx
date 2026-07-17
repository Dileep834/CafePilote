import React, { useState } from 'react';
import { usePermissionsStore } from '@/store/usePermissionsStore';
import { PERMISSION_MODULES } from '@/constants/permissions';
import { Shield, ShieldAlert, Check, CheckSquare, Square } from 'lucide-react';
import type { RoleType } from '@/constants';

export function RolesPermissions() {
  const { updateRolePermissions, getPermissionsForRole } = usePermissionsStore();
  
  // Available system roles to configure (excluding Super Admin since it has everything by default)
  const configurableRoles: RoleType[] = ['Admin', 'Franchise Manager', 'Cashier', 'Kitchen Staff'];
  const [selectedRole, setSelectedRole] = useState<RoleType>('Admin');
  
  const [currentPermissions, setCurrentPermissions] = useState<string[]>(getPermissionsForRole('Admin'));
  const [isSaved, setIsSaved] = useState(false);

  // Sync state when selecting a different role
  const handleRoleSelect = (role: RoleType) => {
    setSelectedRole(role);
    setCurrentPermissions(getPermissionsForRole(role));
    setIsSaved(false);
  };

  const togglePermission = (permId: string) => {
    setCurrentPermissions(prev => 
      prev.includes(permId) 
        ? prev.filter(p => p !== permId) 
        : [...prev, permId]
    );
  };

  const toggleModule = (modulePermIds: string[]) => {
    // If all module perms are already checked, uncheck them all. Otherwise check them all.
    const allChecked = modulePermIds.every(id => currentPermissions.includes(id));
    if (allChecked) {
      setCurrentPermissions(prev => prev.filter(p => !modulePermIds.includes(p)));
    } else {
      setCurrentPermissions(prev => {
        const newPerms = new Set([...prev, ...modulePermIds]);
        return Array.from(newPerms);
      });
    }
  };

  const handleSave = () => {
    updateRolePermissions(selectedRole, currentPermissions);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      
      {/* Roles List */}
      <div className="lg:w-1/4 shrink-0">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600" />
              System Roles
            </h3>
          </div>
          <div className="p-2 space-y-1">
            {configurableRoles.map(role => (
              <button
                key={role}
                onClick={() => handleRoleSelect(role)}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
                  selectedRole === role 
                    ? 'bg-purple-50 text-purple-700 font-bold' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
          
          <div className="p-4 bg-amber-50/50 border-t border-amber-100">
            <p className="text-xs text-amber-700 flex items-start gap-1.5 leading-relaxed">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <strong>Super Admin</strong> is hardcoded to have all permissions to prevent system lockout.
            </p>
          </div>
        </div>
      </div>

      {/* Permissions Grid */}
      <div className="lg:w-3/4 flex-1">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col h-full">
          
          <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between bg-slate-50 rounded-t-xl">
            <div>
              <h2 className="text-lg font-black text-slate-800">Editing: <span className="text-purple-600">{selectedRole}</span></h2>
              <p className="text-xs text-slate-500 mt-1">Check the boxes below to grant access to specific features.</p>
            </div>
            <button 
              onClick={handleSave}
              className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm"
            >
              {isSaved ? <Check className="w-4 h-4 text-green-400" /> : <Shield className="w-4 h-4" />}
              {isSaved ? 'Saved!' : 'Save Permissions'}
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {PERMISSION_MODULES.map(module => {
              const moduleIds = module.permissions.map(p => p.id);
              const allChecked = moduleIds.every(id => currentPermissions.includes(id));
              const someChecked = moduleIds.some(id => currentPermissions.includes(id)) && !allChecked;
              
              return (
                <div key={module.module} className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm hover:border-slate-200 transition-colors">
                  {/* Module Header */}
                  <div 
                    className={`px-4 py-2.5 border-b flex items-center justify-between cursor-pointer transition-colors ${
                      allChecked ? 'bg-purple-50/50 border-purple-100' : 'bg-slate-50 border-slate-100'
                    }`}
                    onClick={() => toggleModule(moduleIds)}
                  >
                    <span className={`font-bold text-sm ${allChecked ? 'text-purple-900' : 'text-slate-700'}`}>
                      {module.module}
                    </span>
                    <button className={`p-0.5 rounded transition-colors ${allChecked ? 'text-purple-600' : someChecked ? 'text-purple-400' : 'text-slate-300'}`}>
                      {allChecked ? <CheckSquare className="w-5 h-5" /> : someChecked ? <div className="w-5 h-5 bg-purple-100 rounded flex items-center justify-center border border-purple-300"><div className="w-2.5 h-0.5 bg-purple-600 rounded-full" /></div> : <Square className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  {/* Permissions List */}
                  <div className="p-2">
                    {module.permissions.map(perm => {
                      const isGranted = currentPermissions.includes(perm.id);
                      return (
                        <label key={perm.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
                          <div className={`relative flex items-center justify-center w-5 h-5 rounded border ${isGranted ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-300 text-transparent group-hover:border-purple-400'} transition-all`}>
                            <Check className="w-3.5 h-3.5" strokeWidth={3} />
                            <input 
                              type="checkbox" 
                              className="sr-only"
                              checked={isGranted}
                              onChange={() => togglePermission(perm.id)}
                            />
                          </div>
                          <span className={`text-sm ${isGranted ? 'text-slate-800 font-medium' : 'text-slate-600'}`}>
                            {perm.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
