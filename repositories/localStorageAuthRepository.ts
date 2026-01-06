import { IAuthRepository } from './interfaces';
import { User } from '../types';

const USERS_KEY = 'foodyar-users-v3';
const CURRENT_USER_KEY = 'foodyar-currentUser-v3';

export class LocalStorageAuthRepository implements IAuthRepository {
  async loadUsers(): Promise<User[]> {
    try {
      const item = window.localStorage.getItem(USERS_KEY);
      return item ? JSON.parse(item) : [];
    } catch (error) {
        console.error("Failed to load users from localStorage", error);
        return [];
    }
  }

  async saveUsers(users: User[]): Promise<void> {
    try {
      window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch (error) {
      console.error("Failed to save users to localStorage", error);
    }
  }

  async loadCurrentUser(): Promise<User | null> {
    try {
      const item = window.localStorage.getItem(CURRENT_USER_KEY);
      return item ? JSON.parse(item) : null;
    } catch (error) {
        console.error("Failed to load current user from localStorage", error);
        return null;
    }
  }

  async saveCurrentUser(user: User | null): Promise<void> {
    try {
      window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error("Failed to save current user to localStorage", error);
    }
  }

  async clear(): Promise<void> {
    window.localStorage.removeItem(USERS_KEY);
    window.localStorage.removeItem(CURRENT_USER_KEY);
  }
}
