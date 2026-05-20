import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

import { useUser } from '@/lib/auth';

interface Props {
  children: ReactNode;
}

/** Wraps protected routes. Redirects to /login when no session. */
export function ProtectedRoute({ children }: Props) {
  const { user, loading } = useUser();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--dio-grey)',
          fontSize: 'var(--text-sm)',
        }}
      >
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
