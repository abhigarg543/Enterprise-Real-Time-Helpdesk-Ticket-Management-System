import React, { createContext, useState, useEffect } from 'react';
import * as authService from '../api/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
    setLoading(false);
  }, []);

  const loginUser = async (email, password) => {
    const data = await authService.login(email, password);
    setCurrentUser(data);
    return data;
  };

  const logoutUser = () => {
    authService.logout();
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, loginUser, logoutUser, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
