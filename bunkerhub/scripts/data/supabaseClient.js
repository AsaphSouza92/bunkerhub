import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_CONFIG } from './db.config.js';

// Client único e compartilhado por todo o app — provider de dados,
// autenticação, etc. Nunca crie um segundo createClient() em outro
// arquivo: teria sessão de login separada e daria bugs sutis.
export const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
