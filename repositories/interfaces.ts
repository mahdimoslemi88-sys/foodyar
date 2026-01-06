import { User } from '../types';
import { RestaurantState } from '../store/restaurantStore';

export interface IAppRepository {
  load(): Promise<Partial<RestaurantState> | null>;
  save(state: Omit<RestaurantState, keyof import('../store/restaurantStore').RestaurantActions>): Promise<void>;
  clear(): Promise<void>;
}

export interface IAuthRepository {
  loadUsers(): Promise<User[]>;
  saveUsers(users: User[]): Promise<void>;
  loadCurrentUser(): Promise<User | null>;
  saveCurrentUser(user: User | null): Promise<void>;
  clear(): Promise<void>;
}
