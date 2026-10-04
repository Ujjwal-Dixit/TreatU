import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/api/endpoints/users';
import { useAuth } from '@/auth/auth-context';

export function useMe() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: ['me'], queryFn: getMe, enabled: isAuthenticated });
}
