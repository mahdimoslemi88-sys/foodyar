import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { User } from '../types';
import { isDemoMode } from '../config/features';
import { LocalStorageAuthRepository } from '../repositories/localStorageAuthRepository';
import { IAuthRepository } from '../repositories/interfaces';

const defaultUsers: User[] = [];

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  registerUser: (newUser: Omit<User, 'id' | 'createdAt'>) => Promise<void>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  checkSystemStatus: () => 'NOT_INITIALIZED' | 'INITIALIZED';
  resetAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Instantiate the repository. In a larger app, this might be provided via dependency injection.
const authRepository: IAuthRepository = new LocalStorageAuthRepository();

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(defaultUsers);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAuthData = async () => {
        setLoading(true);
        const [loadedUsers, loadedCurrentUser] = await Promise.all([
            authRepository.loadUsers(),
            authRepository.loadCurrentUser()
        ]);
        setUsers(loadedUsers);
        setCurrentUser(loadedCurrentUser);
        setLoading(false);
    };
    loadAuthData();
  }, []);

  const checkSystemStatus = useCallback((): 'NOT_INITIALIZED' | 'INITIALIZED' => {
    return users.filter(u => !u.isDeleted).length === 0 ? 'NOT_INITIALIZED' : 'INITIALIZED';
  }, [users]);

  const login = useCallback(async (username: string, password: string) => {
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && !u.isDeleted);

    if (!user) {
      throw new Error('کاربری با این نام کاربری یافت نشد.');
    }
    
    const isADemoAccount = isDemoMode && ['manager@foodyar.com', 'chef@foodyar.com', 'cashier@foodyar.com'].includes(user.username.toLowerCase());
    if (!isADemoAccount && user.password !== password) {
      throw new Error('رمز عبور اشتباه است.');
    }
    
    if (!user.isActive) {
      throw new Error('حساب کاربری شما غیرفعال شده است.');
    }
    
    setCurrentUser(user);
    await authRepository.saveCurrentUser(user);
  }, [users]);

  const logout = useCallback(async () => {
    setCurrentUser(null);
    await authRepository.saveCurrentUser(null);
  }, []);

  const resetAuth = useCallback(async () => {
    setUsers([]);
    setCurrentUser(null);
    await authRepository.clear();
  }, []);

  const registerUser = useCallback(async (userData: Omit<User, 'id' | 'createdAt'>) => {
    const existingUser = users.find(u => u.username.toLowerCase() === userData.username.toLowerCase() && !u.isDeleted);
    if (existingUser) {
      throw new Error('این نام کاربری قبلا ثبت شده است.');
    }

    const newUser: User = { ...userData, id: crypto.randomUUID(), createdAt: Date.now(), isDeleted: false };
    
    const newUsers = [...users, newUser];
    setUsers(newUsers);
    await authRepository.saveUsers(newUsers);

    // FIX: Automatically log in the user upon successful registration
    setCurrentUser(newUser);
    await authRepository.saveCurrentUser(newUser);
  }, [users]);

  const updateUser = useCallback(async (userId: string, updates: Partial<User>) => {
    const newUsers = users.map(u => (u.id === userId ? { ...u, ...updates } : u));
    setUsers(newUsers);
    await authRepository.saveUsers(newUsers);
    
    if (currentUser?.id === userId) {
        const updatedCurrentUser = { ...currentUser, ...updates };
        setCurrentUser(updatedCurrentUser);
        await authRepository.saveCurrentUser(updatedCurrentUser);
    }
  }, [users, currentUser]);

  const deleteUser = useCallback(async (userId: string) => {
      const newUsers = users.map(u => u.id === userId ? { ...u, isDeleted: true } : u);
      setUsers(newUsers);
      await authRepository.saveUsers(newUsers);

      if (currentUser?.id === userId) {
          setCurrentUser(null);
          await authRepository.saveCurrentUser(null);
      }
  }, [users, currentUser]);
  
  const value: AuthContextType = useMemo(() => ({
    currentUser,
    users: users.filter(u => !u.isDeleted),
    loading,
    login,
    logout,
    registerUser,
    updateUser,
    deleteUser,
    checkSystemStatus,
    resetAuth,
  }), [currentUser, users, loading, login, logout, registerUser, updateUser, deleteUser, checkSystemStatus, resetAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};