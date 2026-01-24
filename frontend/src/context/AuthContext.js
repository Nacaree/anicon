"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { supabase } from "@/lib/supabase";
import { authApi } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAuthenticated = !!user;
  const emailVerified = user?.email_confirmed_at != null;

  // Fetch profile from backend
  const fetchProfile = useCallback(async () => {
    try {
      const response = await authApi.getCurrentUser();
      setProfile(response.profile);
      return response;
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      setProfile(null);
      throw err;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (session?.user) {
          setUser(session.user);
          // Only fetch profile if email is verified
          if (session.user.email_confirmed_at) {
            try {
              await fetchProfile();
            } catch (profileErr) {
              // Ignore abort errors during profile fetch
              if (profileErr.name === "AbortError") {
                console.log("Profile fetch aborted (component unmounted)");
                return;
              }
              throw profileErr;
            }
          }
        }
      } catch (err) {
        // Ignore abort errors - they happen during React StrictMode double-mounting
        if (err.name === "AbortError") {
          console.log("Auth initialization aborted (component unmounted)");
          return;
        }
        if (isMounted) {
          console.error("Auth initialization error:", err);
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);

      if (session?.user) {
        setUser(session.user);
        // Fetch profile on sign in or token refresh if email verified
        if (
          (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") &&
          session.user.email_confirmed_at
        ) {
          await fetchProfile();
        }
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Sign up with email and password
  const signUp = async ({ email, password, username, displayName }) => {
    setError(null);

    // Create Supabase auth user with profile data in metadata
    // Database trigger automatically creates the profile immediately
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
          display_name: displayName,
        },
        // Optional: Redirect for email verification
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    });

    if (authError) {
      throw authError;
    }

    setUser(authData.user);
    return authData;
  };

  // Sign in with email and password
  const signIn = async ({ email, password }) => {
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword(
      {
        email,
        password,
      },
    );

    if (signInError) {
      throw signInError;
    }

    setUser(data.user);

    // Fetch profile if email is verified
    if (data.user.email_confirmed_at) {
      await fetchProfile();
    }

    return data;
  };

  // Sign in with magic link (passwordless login)
  // This sends an email with a one-time login link to the user.
  // When clicked, the link redirects to /auth/callback where the session is established.
  const signInWithMagicLink = async (email) => {
    setError(null);

    const { error: magicLinkError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // emailRedirectTo tells Supabase where to redirect after the magic link is clicked.
        // This must match the callback page that handles session establishment.
        // Without this, Supabase may redirect to an unexpected URL.
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    });

    if (magicLinkError) {
      throw magicLinkError;
    }
  };

  // Sign out
  const signOut = async () => {
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      throw signOutError;
    }

    setUser(null);
    setProfile(null);
  };

  // Resend verification email
  const resendVerification = async (email) => {
    await authApi.resendVerification(email);
  };

  // Send password reset email
  const resetPassword = async (email) => {
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {},
    );

    if (resetError) {
      throw resetError;
    }
  };

  // Update password (for reset password flow)
  const updatePassword = async (newPassword) => {
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      throw updateError;
    }
  };

  // Refresh session
  const refreshSession = async () => {
    const { data, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError) {
      throw refreshError;
    }

    if (data.session) {
      setUser(data.session.user);
      if (data.session.user.email_confirmed_at) {
        await fetchProfile();
      }
    }

    return data;
  };

  const value = {
    user,
    profile,
    isLoading,
    isAuthenticated,
    emailVerified,
    error,
    signUp,
    signIn,
    signInWithMagicLink,
    signOut,
    resendVerification,
    resetPassword,
    updatePassword,
    refreshSession,
    fetchProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
