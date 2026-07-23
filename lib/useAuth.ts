'use client';

import { useMsal } from '@azure/msal-react';
import { useEffect, useState } from 'react';

export interface User {
  name?: string;
  email?: string;
  id?: string;
}

export function useAuth() {
  const { instance, accounts } = useMsal();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accounts && accounts.length > 0) {
      const account = accounts[0];
      setUser({
        name: account.name,
        email: account.username,
        id: account.localAccountId,
      });
    }
    setLoading(false);
  }, [accounts]);

  const login = async () => {
    try {
      await instance.loginPopup({
        scopes: ['openid', 'profile', 'email'],
      });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const logout = async () => {
    try {
      await instance.logoutPopup();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };
}
