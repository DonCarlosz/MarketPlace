import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import API from '../services/api';
import { syncSocketAuth } from '../services/socket';

const AuthContext = createContext();

const normalizeUser = (u) => {
  if (!u) return null;
  const id = (u._id || u.id)?.toString();
  return { ...u, _id: id, id };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? normalizeUser(JSON.parse(saved)) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState('login');

  const openAuthModal = useCallback((view = 'login') => {
    setAuthModalView(view);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        syncSocketAuth(token);
        try {
          const res = await API.get('/auth/me');
          if (res.data?.success) {
            const normalized = normalizeUser(res.data.user);
            setUser(normalized);
            localStorage.setItem('user', JSON.stringify(normalized));
          }
        } catch {
          setUser(null);
          localStorage.removeItem('user');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          syncSocketAuth(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    if (res.data?.success) {
      const normalized = normalizeUser(res.data.user);
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(normalized));
      syncSocketAuth(res.data.accessToken);
      setUser(normalized);
      setIsAuthModalOpen(false);
      return res.data;
    }
  }, []);

  const sendSignupOtp = useCallback(async (userData) => {
    const res = await API.post('/auth/send-signup-otp', userData);
    return res.data;
  }, []);

  const verifySignupOtp = useCallback(async (email, otp) => {
    const res = await API.post('/auth/verify-signup-otp', { email, otp });
    if (res.data?.success) {
      const normalized = normalizeUser(res.data.user);
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(normalized));
      syncSocketAuth(res.data.accessToken);
      setUser(normalized);
      setIsAuthModalOpen(false);
      return res.data;
    }
  }, []);

  const sendForgotPasswordOtp = useCallback(async (email) => {
    const res = await API.post('/auth/forgot-password-otp', { email });
    return res.data;
  }, []);

  const resetPasswordWithOtp = useCallback(async (email, otp, newPassword) => {
    const res = await API.post('/auth/reset-password-otp', { email, otp, newPassword });
    return res.data;
  }, []);

  const resendOtp = useCallback(async (email, purpose = 'signup') => {
    const res = await API.post('/auth/resend-otp', { email, purpose });
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await API.post('/auth/logout', { token: refreshToken });
    } catch {
      // Proceed with local cleanup even if offline
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      syncSocketAuth(null);
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((updatedData) => {
    const normalized = normalizeUser(updatedData);
    setUser(normalized);
    localStorage.setItem('user', JSON.stringify(normalized));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      sendSignupOtp,
      verifySignupOtp,
      sendForgotPasswordOtp,
      resetPasswordWithOtp,
      resendOtp,
      logout,
      updateUser,
      isAuthModalOpen,
      authModalView,
      openAuthModal,
      closeAuthModal,
      setAuthModalView,
    }),
    [
      user,
      loading,
      login,
      sendSignupOtp,
      verifySignupOtp,
      sendForgotPasswordOtp,
      resetPasswordWithOtp,
      resendOtp,
      logout,
      updateUser,
      isAuthModalOpen,
      authModalView,
      openAuthModal,
      closeAuthModal,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
