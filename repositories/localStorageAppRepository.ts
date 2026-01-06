import { IAppRepository } from './interfaces';
import { RestaurantState } from '../store/restaurantStore';

const APP_STATE_KEY = 'foodyar-restaurant-storage-v3';

export class LocalStorageAppRepository implements IAppRepository {
  async load(): Promise<Partial<RestaurantState> | null> {
    try {
      const item = window.localStorage.getItem(APP_STATE_KEY);
      if (item) {
        const persisted = JSON.parse(item);
        const version = persisted.version ?? 0;

        // Manual migration from older versions to version 4
        if (version < 4) {
          if (persisted.state && persisted.state.settings && !persisted.state.settings.subscription) {
            persisted.state.settings.subscription = {
              tier: 'free_trial',
              startDate: 0,
              expiryDate: 0,
              isActive: false,
            };
          }
          // Add other migration logic as needed
        }
        
        return persisted.state || null;
      }
      return null;
    } catch (error) {
      console.error("Failed to load app state from localStorage", error);
      // Optional: Clear corrupted data
      // window.localStorage.removeItem(APP_STATE_KEY);
      return null;
    }
  }

  async save(state: Omit<RestaurantState, keyof import('../store/restaurantStore').RestaurantActions>): Promise<void> {
    try {
      // Mimic the structure of zustand/persist for potential compatibility.
      const dataToSave = {
        state: state,
        version: 4 
      };
      window.localStorage.setItem(APP_STATE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error("Failed to save app state to localStorage", error);
    }
  }

  async clear(): Promise<void> {
    window.localStorage.removeItem(APP_STATE_KEY);
  }
}
