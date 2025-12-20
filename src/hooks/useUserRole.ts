import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'adminsaas' | 'admin' | 'user';

interface UseUserRoleReturn {
  role: AppRole | null;
  isLoading: boolean;
  isAdminSaas: boolean;
  isAdmin: boolean;
  isUser: boolean;
  hasRole: (role: AppRole) => boolean;
}

export const useUserRole = (): UseUserRoleReturn => {
  const { user } = useAuth();

  const { data: role, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .rpc('get_user_role', { _user_id: user.id });

      if (error) {
        console.error('Error fetching user role:', error);
        return 'user' as AppRole; // Default to user if error
      }

      return (data as AppRole) || 'user';
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const currentRole = role || null;

  return {
    role: currentRole,
    isLoading,
    isAdminSaas: currentRole === 'adminsaas',
    isAdmin: currentRole === 'admin' || currentRole === 'adminsaas',
    isUser: currentRole === 'user',
    hasRole: (r: AppRole) => {
      if (!currentRole) return false;
      if (currentRole === 'adminsaas') return true; // adminsaas has all permissions
      if (currentRole === 'admin' && r !== 'adminsaas') return true;
      return currentRole === r;
    },
  };
};
