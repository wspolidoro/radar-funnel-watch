import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Organization, UserRole } from '@/types';
import { mockUser, mockOrganization } from '@/services/mockData';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);

  useEffect(() => {
    // Simulate checking for existing session
    const storedUser = localStorage.getItem('radarmail_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setOrganization(mockOrganization);
    }
  }, []);

  const login = async (email: string, password: string) => {
    // Mock login - replace with real authentication
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser(mockUser);
    setOrganization(mockOrganization);
    localStorage.setItem('radarmail_user', JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    setOrganization(null);
    localStorage.removeItem('radarmail_user');
  };

  const hasRole = (roles: UserRole[]) => {
    return user ? roles.includes(user.role) : false;
  };

  return (
    <AuthContext.Provider value={{
      user,
      organization,
      isAuthenticated: !!user,
      login,
      logout,
      hasRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
