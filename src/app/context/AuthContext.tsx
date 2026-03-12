import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api';

type Role = 'owner' | 'staf';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isOwner: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await api.get('/me');
          setUser(response.data);
        } catch (error) {
          console.error("Failed to fetch user profile", error);
          localStorage.removeItem('token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/login', { email, password });
      const { user: userData, token } = response.data;

      localStorage.setItem('token', token);
      setUser(userData);
    } catch (error) {
      console.error("Login Error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch (error) {
      console.error("Logout Error:", error);
    } finally {
      setUser(null);
      localStorage.removeItem('token');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isOwner: user?.role === 'owner' }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
