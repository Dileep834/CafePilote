import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RoleType } from '@/constants';

export interface RolePermissions {
  roleName: RoleType;
  permissions: string[];
}

interface PermissionsState {
  rolePermissions: RolePermissions[];
  
  getPermissionsForRole: (role: RoleType) => string[];
  hasPermission: (role: RoleType, permissionId: string) => boolean;
  updateRolePermissions: (role: RoleType, permissions: string[]) => void;
}

const DEFAULT_PERMISSIONS: RolePermissions[] = [
  {
    roleName: 'Super Admin',
    permissions: ['pos.access', 'pos.checkout', 'pos.discount', 'inventory.view', 'inventory.adjust', 'purchase.manage', 'crm.manage', 'marketing.manage', 'reports.view', 'franchise.manage', 'settings.manage', 'users.manage']
  },
  {
    roleName: 'Admin',
    permissions: ['pos.access', 'pos.checkout', 'pos.discount', 'inventory.view', 'inventory.adjust', 'purchase.manage', 'crm.manage', 'marketing.manage', 'reports.view', 'users.manage']
  },
  {
    roleName: 'Franchise Manager',
    permissions: ['pos.access', 'pos.checkout', 'pos.discount', 'inventory.view', 'inventory.adjust', 'purchase.manage', 'crm.manage', 'marketing.manage', 'reports.view']
  },
  {
    roleName: 'Cashier',
    permissions: ['pos.access', 'pos.checkout', 'crm.manage']
  },
  {
    roleName: 'Kitchen Staff',
    permissions: ['kitchen.access']
  }
];

export const usePermissionsStore = create<PermissionsState>()(
  persist(
    (set, get) => ({
      rolePermissions: DEFAULT_PERMISSIONS,

      getPermissionsForRole: (role) => {
        const rp = get().rolePermissions.find(r => r.roleName === role);
        return rp ? rp.permissions : [];
      },

      hasPermission: (role, permissionId) => {
        // Super Admins automatically have all permissions to prevent lockout
        if (role === 'Super Admin') return true;
        
        const perms = get().getPermissionsForRole(role);
        return perms.includes(permissionId);
      },

      updateRolePermissions: (role, permissions) => {
        set((state) => {
          const exists = state.rolePermissions.find(r => r.roleName === role);
          if (exists) {
            return {
              rolePermissions: state.rolePermissions.map(r => 
                r.roleName === role ? { ...r, permissions } : r
              )
            };
          } else {
            return {
              rolePermissions: [...state.rolePermissions, { roleName: role, permissions }]
            };
          }
        });
      }
    }),
    {
      name: 'cafepilot-permissions-store'
    }
  )
);
