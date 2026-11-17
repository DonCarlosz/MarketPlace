import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';

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

  // Pinterest-style Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState('login'); // 'login' | 'register' | 'forgot'

  const openAuthModal = (view = 'login') => {
    setAuthModalView(view);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const res = await API.get('/auth/me');
          if (res.data?.success) {
            const normalized = normalizeUser(res.data.user);
            setUser(normalized);
            localStorage.setItem('user', JSON.stringify(normalized));
          }
        } catch (err) {
          setUser(null);
          localStorage.removeItem('user');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    if (res.data?.success) {
      const normalized = normalizeUser(res.data.user);
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(normalized));
      setUser(normalized);
      setIsAuthModalOpen(false); // Close popup upon successful login
      return res.data;
    }
  };

  const register = async (userData) => {
    const res = await API.post('/auth/register', userData);
    if (res.data?.success) {
      const normalized = normalizeUser(res.data.user);
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(normalized));
      setUser(normalized);
      setIsAuthModalOpen(false); // Close popup upon successful register
      return res.data;
    }
  };

  const sendSignupOtp = async (userData) => {
    const res = await API.post('/auth/send-signup-otp', userData);
    return res.data;
  };

  const verifySignupOtp = async (email, otp) => {
    const res = await API.post('/auth/verify-signup-otp', { email, otp });
    if (res.data?.success) {
      const normalized = normalizeUser(res.data.user);
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(normalized));
      setUser(normalized);
      setIsAuthModalOpen(false);
      return res.data;
    }
  };

  const sendForgotPasswordOtp = async (email) => {
    const res = await API.post('/auth/forgot-password-otp', { email });
    return res.data;
  };

  const resetPasswordWithOtp = async (email, otp, newPassword) => {
    const res = await API.post('/auth/reset-password-otp', { email, otp, newPassword });
    return res.data;
  };

  const resendOtp = async (email, purpose = 'signup') => {
    const res = await API.post('/auth/resend-otp', { email, purpose });
    return res.data;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      await API.post('/auth/logout', { token: refreshToken });
    } catch (err) {
      // Ignore error during logout
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  const updateUser = (updatedData) => {
    const normalized = normalizeUser(updatedData);
    setUser(normalized);
    localStorage.setItem('user', JSON.stringify(normalized));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
