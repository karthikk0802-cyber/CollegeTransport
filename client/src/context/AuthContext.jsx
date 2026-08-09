import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Set base URL for axios
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  axios.defaults.baseURL = API_URL;

  // Set authorization header if token exists
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  // Load user profile on startup if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const res = await axios.get('/auth/me');
          if (res.data && res.data.success) {
            setUser(res.data.data);
          } else {
            handleLogout();
          }
        } catch (err) {
          console.error('Error loading user profile:', err.message);
          handleLogout();
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  const handleLogin = async (email, password) => {
    try {
      const res = await axios.post('/auth/login', { email, password });
      if (res.data && res.data.success) {
        const { token: userToken, ...userData } = res.data.data;
        localStorage.setItem('token', userToken);
        setToken(userToken);
        setUser(userData);
        return { success: true };
      }
    } catch (err) {
      console.error('Login request error:', err.response?.data?.message || err.message);
      return {
        success: false,
        message: err.response?.data?.message || 'Login failed. Please check credentials.'
      };
    }
  };

  const handleRegister = async (userData) => {
    try {
      const res = await axios.post('/auth/register', userData);
      if (res.data && res.data.success) {
        const { token: userToken, ...registeredData } = res.data.data;
        localStorage.setItem('token', userToken);
        setToken(userToken);
        setUser(registeredData);
        return { success: true };
      }
    } catch (err) {
      console.error('Register request error:', err.response?.data?.message || err.message);
      return {
        success: false,
        message: err.response?.data?.message || 'Registration failed.'
      };
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = (updatedUser) => {
    setUser((prev) => ({ ...prev, ...updatedUser }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        updateProfile,
        apiUrl: API_URL
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
