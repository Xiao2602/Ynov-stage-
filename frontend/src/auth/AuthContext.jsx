import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { getCurrentUserFromBackend } from '../services/authTest';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [backendUser, setBackendUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState('');

  const loadBackendUser = useCallback(async (firebaseUser) => {
    if (!firebaseUser) {
      setBackendUser(null);
      setBackendError('');
      return;
    }

    setBackendLoading(true);
    setBackendError('');

    try {
      // Force-refresh once so newly assigned Custom Claims are visible.
      await firebaseUser.getIdToken(true);
      const data = await getCurrentUserFromBackend();

      if (!data?.success || !data?.user) {
        throw new Error('Le backend n’a pas pu récupérer le profil utilisateur.');
      }

      setBackendUser(data.user);
    } catch (error) {
      console.error('Erreur de synchronisation avec le backend :', error);
      setBackendUser(null);
      setBackendError(error.message || 'Impossible de contacter le backend.');
    } finally {
      setBackendLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        await loadBackendUser(firebaseUser);
      } else {
        setBackendUser(null);
        setBackendError('');
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [loadBackendUser]);

  const refreshBackendUser = useCallback(async () => {
    if (!auth.currentUser) return null;
    await loadBackendUser(auth.currentUser);
    return backendUser;
  }, [loadBackendUser, backendUser]);

  const logout = useCallback(async () => {
    await signOut(auth);
    setBackendUser(null);
    setBackendError('');
  }, []);

  const value = {
    user,
    backendUser,
    role: backendUser?.role || null,
    loading,
    backendLoading,
    backendError,
    isAuthenticated: !!user,
    logout,
    refreshBackendUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth doit être utilisé à l’intérieur de AuthProvider');
  }

  return context;
}
