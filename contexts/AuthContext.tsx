import React, { createContext, useState, useContext, ReactNode, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { User, View } from '../types';
import { AuthError, Session } from '@supabase/supabase-js';

// Supabase returns snake_case, our app uses camelCase.
// This profile type is assumed to match your DB schema.
interface Profile {
  id: string;
  full_name: string;
  role: 'manager' | 'cashier' | 'chef' | 'server';
  permissions: View[];
  is_active: boolean;
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  registerUser: (newUser: Omit<User, 'id' | 'createdAt' | 'isDeleted' | 'password'> & { password?: string }) => Promise<void>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  checkSystemStatus: () => Promise<'NOT_INITIALIZED' | 'INITIALIZED'>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Map Supabase profile to application User
  const mapProfileToUser = (profile: Profile, sessionUser: any): User => ({
    id: profile.id,
    fullName: profile.full_name,
    username: sessionUser.email || sessionUser.phone || '', // username is email/phone in supabase
    password: '', // Don't store password
    role: profile.role,
    permissions: profile.permissions,
    isActive: profile.is_active,
    createdAt: new Date(sessionUser.created_at).getTime(),
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setLoading(true);
      if (session?.user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          setCurrentUser(null);
        } else if (profile) {
          setCurrentUser(mapProfileToUser(profile, session.user));
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    
    // Check for initial session on app load
    const checkInitialSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if(!session) {
            setLoading(false);
        }
    }
    checkInitialSession();

    return () => subscription.unsubscribe();
  }, []);

  const checkSystemStatus = async (): Promise<'NOT_INITIALIZED' | 'INITIALIZED'> => {
    const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
    
    if (error) {
        console.error("Error checking system status:", error);
        return 'INITIALIZED'; // Fail safe
    }
    
    return (count === 0) ? 'NOT_INITIALIZED' : 'INITIALIZED';
  };
  
  const login = async (username: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: username, password });
    if (error) throw new Error('نام کاربری یا رمز عبور اشتباه است.');
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    setCurrentUser(null);
  };
  
  const registerUser = async (userData: Omit<User, 'id' | 'createdAt' | 'isDeleted' | 'password'> & { password?: string }) => {
    if (!userData.password) throw new Error("رمز عبور برای کاربر جدید الزامی است.");

    // First, sign up the user in the auth schema
    const { data, error } = await supabase.auth.signUp({
        email: userData.username,
        password: userData.password,
        options: {
            data: {
                full_name: userData.fullName,
            }
        }
    });

    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("ثبت نام ناموفق بود، کاربر ایجاد نشد.");

    // Then, insert their profile into the public `profiles` table
    const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: userData.fullName,
        role: userData.role,
        permissions: userData.permissions,
        is_active: userData.isActive,
    });

    if (profileError) {
        console.error("Error creating profile:", profileError);
        // Attempt to clean up the auth user if profile creation fails
        await supabase.auth.admin.deleteUser(data.user.id);
        throw new Error("خطا در ایجاد پروفایل کاربری. ممکن است این نام کاربری قبلا ثبت شده باشد.");
    }
    
    // onAuthStateChange will handle setting the current user upon successful sign-up and login.
  };

  const updateUser = async (userId: string, updates: Partial<User>) => {
    const profileUpdates: Partial<Omit<Profile, 'id'>> = {};
    if (updates.fullName) profileUpdates.full_name = updates.fullName;
    if (updates.role) profileUpdates.role = updates.role;
    if (updates.permissions) profileUpdates.permissions = updates.permissions;
    if (updates.isActive !== undefined) profileUpdates.is_active = updates.isActive;
    
    const { error } = await supabase.from('profiles').update(profileUpdates).eq('id', userId);
    if (error) throw new Error(error.message);
    
    if (currentUser?.id === userId) {
        setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteUser = async (userId: string) => {
    // This is a soft delete by deactivating the user profile.
    await updateUser(userId, { isActive: false });
  };
  
  const resetAuth = async () => {
    // This function is for local development and should not be used in production
    // as it does not clear Supabase users.
    console.warn("resetAuth is a no-op when using Supabase provider.");
  };

  const value = useMemo(() => ({
    currentUser,
    users: [], // User list management should be handled by a dedicated admin view querying supabase
    loading,
    login,
    logout,
    registerUser,
    updateUser,
    deleteUser,
    checkSystemStatus,
    resetAuth, // Kept for interface consistency, but is a no-op
  }), [currentUser, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
