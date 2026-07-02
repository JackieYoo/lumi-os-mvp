import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { apiRequest, getToken, removeToken, setToken } from '../lib/api.js';

interface User {
  id: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (getToken()) {
      apiRequest<User>('GET', '/auth/me')
        .then(setUser)
        .catch(() => {
          removeToken();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const result = await apiRequest<{ user: User; token: string }>('POST', '/auth/login', {
      username,
      password,
    });
    setToken(result.token);
    setUser(result.user);
  };

  const register = async (username: string, password: string) => {
    const result = await apiRequest<{ user: User; token: string }>('POST', '/auth/register', {
      username,
      password,
    });
    setToken(result.token);
    setUser(result.user);
  };

  const logout = () => {
    removeToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export { AuthContext };
