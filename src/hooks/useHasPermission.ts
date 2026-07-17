import { useAuthStore } from '@/store/useAuthStore';
import { usePermissionsStore } from '@/store/usePermissionsStore';

export function useHasPermission(permissionId: string): boolean {
  const { user } = useAuthStore();
  const { hasPermission } = usePermissionsStore();

  if (!user || !user.role) return false;
  
  return hasPermission(user.role, permissionId);
}
