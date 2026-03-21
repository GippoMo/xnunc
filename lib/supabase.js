import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variabili Supabase mancanti: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY devono essere definite in .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ─── Auth helpers ────────────────────────────────────────────────────────────

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email, password, meta = {}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: meta },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ─── Profile helpers ─────────────────────────────────────────────────────────

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function upsertProfile(profile) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Skills catalog ──────────────────────────────────────────────────────────

export async function getSkills() {
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('is_active', true)
    .order('area', { ascending: true });
  if (error) throw error;
  return data;
}

// ─── User skills ─────────────────────────────────────────────────────────────

export async function getUserSkills(userId) {
  const { data, error } = await supabase
    .from('user_skills')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function saveUserSkill(skill) {
  const { data, error } = await supabase
    .from('user_skills')
    .upsert(skill, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteUserSkill(skillId) {
  const { error } = await supabase
    .from('user_skills')
    .update({ is_active: false })
    .eq('id', skillId);
  if (error) throw error;
}

// ─── AI Logging ──────────────────────────────────────────────────────────────

export async function logAiCall({ userId, skillId, provider, model, inputChars, outputChars, durationMs, success }) {
  const { error } = await supabase
    .from('ai_logs')
    .insert({
      user_id: userId,
      skill_id: skillId || null,
      provider,
      model,
      input_chars: inputChars,
      output_chars: outputChars,
      duration_ms: durationMs,
      success,
    });
  // Log silenzioso — non bloccare l'app se fallisce
  if (error) console.warn('[ai_log] errore:', error.message);
}

// ─── Threads ─────────────────────────────────────────────────────────────────

export async function getThreads(userId) {
  const { data, error } = await supabase
    .from('threads')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function saveThread(thread) {
  const { data, error } = await supabase
    .from('threads')
    .upsert(thread, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
