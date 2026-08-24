import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from './AuthProvider';

/**
 * Reads the session context set up by `AuthProvider`. Throws when used
 * outside of it -- a screen or hook reading `user`/`status` without a
 * provider mounted is a wiring bug, not a state worth silently defaulting.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
