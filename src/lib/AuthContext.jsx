import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Supabase auth user (id, email, ...)
  const [profile, setProfile] = useState(null); // ligne de la table `profiles` (role, modules, driver_id)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  const fetchProfile = async (userId) => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) {
      console.error('Erreur lors de la récupération du profil:', error.message);
      return null;
    }
    return data;
  };

  const applySession = async (session) => {
    if (session?.user) {
      setUser(session.user);
      const userProfile = await fetchProfile(session.user.id);
      setProfile(userProfile);
      setIsAuthenticated(true);
      setAuthError(null);
    } else {
      setUser(null);
      setProfile(null);
      setIsAuthenticated(false);
    }
    setIsLoadingAuth(false);
  };

  useEffect(() => {
    // 1. Récupère la session existante au chargement de l'app
    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    // 2. Écoute les changements (login, logout, refresh de token)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
  };

  const refreshProfile = async () => {
    if (user?.id) {
      const userProfile = await fetchProfile(user.id);
      setProfile(userProfile);
    }
  };

  // `currentUser` combine les infos Supabase Auth + le profil applicatif (role, modules, driver_id)
  // pour rester compatible avec ce qu'utilisaient les composants (Sidebar, AppLayout...) via base44.auth.me()
  const currentUser = user
    ? {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || '',
        role: profile?.role || 'collecteur_bons',
        modules: profile?.modules || [],
        driver_id: profile?.driver_id || null,
      }
    : null;

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      currentUser,
      isAuthenticated,
      isLoadingAuth,
      authError,
      logout,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};