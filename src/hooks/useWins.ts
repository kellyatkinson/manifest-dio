import { useQuery } from '@tanstack/react-query';

import { listWins } from '@/lib/api';

export type WinsWindow = 7 | 30 | 90 | 'all';

export function useWins(window: WinsWindow) {
  const sinceIso =
    window === 'all'
      ? new Date('2000-01-01T00:00:00Z').toISOString()
      : new Date(Date.now() - window * 24 * 60 * 60 * 1000).toISOString();

  return useQuery({
    queryKey: ['wins', window],
    queryFn: () => listWins(sinceIso),
    staleTime: 30 * 1000,
  });
}
