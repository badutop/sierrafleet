import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // profil applicatif : { id, email, full_name, role, modules, driver_id }
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Charge le profil applicatif (rôle/modules/driver_id) depuis public.profiles.
  // Un utilisateur Supabase Auth sans ligne profiles correspondante n'est pas
  // considéré comme enregistré dans l'app (seul admin-create-user crée les deux).
  const loadProfile = async (sessionUser) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sessionUser.id)
      .single();

    if (error || !profile) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({ type: 'user_not_registered', message: "Ce compte n'est pas enregistré dans l'application" });
      return;
    }

    setUser({ ...profile, email: profile.email || sessionUser.email });
    setIsAuthenticated(true);
    setAuthError(null);
  };

  useEffect(() => {
    let active = true;

    // onAuthStateChange émet un événement INITIAL_SESSION dès l'abonnement
    // (avec la session courante ou null), donc un appel séparé à
    // supabase.auth.getSession() est redondant. On l'a retiré : sur une
    // version ancienne du SDK il pouvait rester bloqué indéfiniment après un
    // rechargement complet de page (contention sur le verrou navigator.locks
    // interne), gelant l'app derrière le spinner de chargement — corrigé
    // aussi par la mise à jour de @supabase/supabase-js.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      if (session?.user) {
        await loadProfile(session.user);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError(null);
      }
      setIsLoadingAuth(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
    // Navigation "dure" (pas useNavigate — AuthProvider est hors du Router)
    // pour toujours retomber sur la landing page publique, quelle que soit
    // la route depuis laquelle on s'est déconnecté (sinon ProtectedRoute
    // renvoie vers /login pour toutes les routes sauf "/").
    window.location.href = "/";
  };

  // Utile après une modification du profil courant (ex: SettingsPage) pour
  // rafraîchir role/modules sans forcer une déconnexion/reconnexion.
  // getUser() plutôt que getSession() : ce dernier peut rester bloqué (voir
  // commentaire plus haut), getUser() interroge directement l'API sans
  // passer par le même verrou interne.
  const refreshProfile = async () => {
    const { data: { user: sessionUser } } = await supabase.auth.getUser();
    if (sessionUser) await loadProfile(sessionUser);
  };

  return (
    <AuthContext.Provider value={{
      user,
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
