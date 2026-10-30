import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, getAuthToken, setAuthToken, clearAuthToken } from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string, totpCode?: string) => Promise<{ requires2fa?: boolean }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(getAuthToken());
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      if (getAuthToken()) {
        const profile = await api.getProfile();
        setUser(profile);
      } else {
        setUser(null);
      }
    } catch {
      clearAuthToken();
      setUser(null);
      setTokenState(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (username: string, password: string, totpCode?: string) => {
    const res = await api.login({
      username_or_email: username,
      password,
      totp_code: totpCode,
    });

    if (res.requires_2fa) {
      return { requires2fa: true };
    }

    if (res.access_token) {
      setAuthToken(res.access_token);
      setTokenState(res.access_token);
      setUser(res.user);
      return { requires2fa: false };
    }

    throw new Error('Login failed: Token not received.');
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
    setTokenState(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        refreshUser: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

