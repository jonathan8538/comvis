import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { User } from 'types';
import { supabase } from "@/lib/supabaseClient";


interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  registrationStep: 'auth' | 'face' | 'blink' | 'complete';
  login: (email: string, password: string) => Promise<User>;
  signup: (email: string, password: string, name: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUserFace: (faceImageUrl: string) => Promise<void>;
  updateUserBlink: (blinkSequence: Blob) => Promise<void>;
  setRegistrationStep: (step: 'auth' | 'face' | 'blink' | 'complete') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registrationStep, setRegistrationStep] = useState<'auth' | 'face' | 'blink' | 'complete'>('auth');

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      console.error("Login failed:", error);
      throw error;
    }

    const loggedInUser = data.user;

    if (!loggedInUser) throw new Error("No user returned");

    setUser({
      id: loggedInUser.id,
      email: loggedInUser.email!,
      name: loggedInUser.user_metadata.full_name,
      createdAt: new Date(loggedInUser.created_at!),
      faceImageUrl: loggedInUser.user_metadata.faceImageUrl,
    });

    setIsAuthenticated(true);

    // Tentukan step registrasi
    if (!loggedInUser.user_metadata.faceImageUrl)
      setRegistrationStep("face");
    else
      setRegistrationStep("complete");

    return {
      id: loggedInUser.id,
      email: loggedInUser.email!,
      name: loggedInUser.user_metadata.full_name,
      createdAt: new Date(loggedInUser.created_at!),
    };
  }, []);


  const signup = useCallback(async (email: string, password: string, name: string) => {
    setIsLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    setIsLoading(false);

    if (error) {
      console.error("Signup failed:", error);
      throw error;
    }

    const createdUser = data.user;

    if (!createdUser) throw new Error("No user returned");

    // Simpan user ke state
    setUser({
      id: createdUser.id,
      email: createdUser.email!,
      name,
      createdAt: new Date(createdUser.created_at!),
    });

    setIsAuthenticated(true);
    setRegistrationStep("face");

    return {
      id: createdUser.id,
      email: createdUser.email!,
      name,
      createdAt: new Date(createdUser.created_at!),
    };
  }, []);


 const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    setRegistrationStep("auth");
  }, []);


  const updateUserFace = useCallback(async (faceImageUrl: string) => {
    if (!user) return;

    const { error } = await supabase.auth.updateUser({
      data: { faceImageUrl }
    });

    if (error) {
      console.error("Update face failed:", error);
      throw error;
    }

    setUser(prev => prev ? { ...prev, faceImageUrl } : null);
    setRegistrationStep("blink");
  }, [user]);


  const updateUserBlink = useCallback(async (blinkUrl: string) => {
    if (!user) return;

    const { error } = await supabase.auth.updateUser({
      data: { blinkUrl }
    });

    if (error) {
      console.error("Update blink failed:", error);
      throw error;
    }

    setUser(prev => prev ? { ...prev, blinkUrl } : null);
    setRegistrationStep("complete");
  }, [user]);


  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        registrationStep,
        login,
        signup,
        logout,
        updateUserFace,
        updateUserBlink,
        setRegistrationStep,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
