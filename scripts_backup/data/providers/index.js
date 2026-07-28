import { DB_PROVIDER } from '../db.config.js';
import { localStorageProvider } from './localStorageProvider.js';
import { firebaseProvider } from './firebaseProvider.js';
import { supabaseProvider } from './supabaseProvider.js';

const PROVIDERS = {
  localStorage: localStorageProvider,
  firebase: firebaseProvider,
  supabase: supabaseProvider,
};

export const activeProvider = PROVIDERS[DB_PROVIDER] || localStorageProvider;
