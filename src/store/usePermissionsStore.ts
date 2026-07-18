import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { APP_ROLES, Role, type RoleType } from '@/constants';
import {
  ALL_PERMISSION_IDS,
  DEFAULT_ROLE_PERMISSIONS,
  type PermissionId,
} from '@/constants/permissions';

export interface RolePermissions {
  roleName: RoleType;
  permissions: PermissionId[];
}

interface PermissionsState {
  rolePermissions: RolePermissions[];
  
  getPermissionsForRole: (role: RoleType) => PermissionId[];
  hasPermission: (role: RoleType, permissionId: PermissionId | string) => boolean;
  updateRolePermissions: (role: RoleType, permissions: Array<PermissionId | string>) => void;
}

const knownPermissions = new Set<string>(ALL_PERMISSION_IDS);

function normalizePermissionIds(permissions: Array<PermissionId | string> = []): PermissionId[] {
  return Array.from(
    new Set(permissions.filter((permission) => knownPermissions.has(permission)))
  ) as PermissionId[];
}

function createDefaultRolePermissions(): RolePermissions[] {
  return APP_ROLES.map((role) => ({
    roleName: role,
    permissions: [...(DEFAULT_ROLE_PERMISSIONS[role] || [])],
  }));
}

function normalizeRolePermissions(
  rolePermissions: RolePermissions[] = [],
  mergeWithDefaults = false
): RolePermissions[] {
  return APP_ROLES.map((role) => {
    const saved = rolePermissions.find((entry) => entry.roleName === role);
    const defaultPermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
    const permissions = mergeWithDefaults
      ? [...defaultPermissions, ...(saved?.permissions || [])]
      : saved?.permissions || defaultPermissions;

    return {
      roleName: role,
      permissions: normalizePermissionIds(permissions),
    };
  });
}

export const usePermissionsStore = create<PermissionsState>()(
  persist(
    (set, get) => ({
      rolePermissions: createDefaultRolePermissions(),

      getPermissionsForRole: (role) => {
        const rp = get().rolePermissions.find(r => r.roleName === role);
        return rp ? normalizePermissionIds(rp.permissions) : [...(DEFAULT_ROLE_PERMISSIONS[role] || [])];
      },

      hasPermission: (role, permissionId) => {
        // Super Admins automatically have all permissions to prevent lockout
        if (role === Role.SUPER_ADMIN) return true;
        
        const perms = get().getPermissionsForRole(role);
        return perms.includes(permissionId as PermissionId);
      },

      updateRolePermissions: (role, permissions) => {
        const normalizedPermissions = normalizePermissionIds(permissions);
        set((state) => {
          const exists = state.rolePermissions.find(r => r.roleName === role);
          if (exists) {
            return {
              rolePermissions: state.rolePermissions.map(r => 
                r.roleName === role ? { ...r, permissions: normalizedPermissions } : r
              )
            };
          } else {
            return {
              rolePermissions: [...state.rolePermissions, { roleName: role, permissions: normalizedPermissions }]
            };
          }
        });
      }
    }),
    {
      name: 'cafepilot-permissions-store',
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as Partial<PermissionsState> | undefined;
        return {
          ...state,
          rolePermissions: normalizeRolePermissions(state?.rolePermissions, true),
        };
      },
    }
  )
);
