import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const setSession = (nextUser, token) => {
    if (token) localStorage.setItem('teamsphere_token', token);
    if (!token) localStorage.removeItem('teamsphere_token');
    setUser(nextUser || null);
  };

  const register = async (payload) => {
    try {
      const { data } = await api.post('/auth/register', payload);
      setSession({ _id: data._id, name: data.name, email: data.email }, data.token);
      return data;
    } catch (err) {
      throw err;
    }
  };

  const login = async (payload) => {
    try {
      const { data } = await api.post('/auth/login', payload);
      setSession({ _id: data._id, name: data.name, email: data.email }, data.token);
      return data;
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    setSession(null, null);
  };

  useEffect(() => {
    const boot = async () => {
      try {
        const token = localStorage.getItem('teamsphere_token');
        if (!token) {
          setLoading(false);
          return;
        }
        const { data } = await api.get('/auth/me');
        setUser(data);
      } catch (e) {
        localStorage.removeItem('teamsphere_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    boot();
  }, []);

  const value = useMemo(
    () => ({ user, loading, register, login, logout }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
