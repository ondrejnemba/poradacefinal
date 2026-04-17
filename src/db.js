import { supabase } from './supabase.js';

const PREFIX = 'emba_poradace_';
let saveTimer = null;
let supabaseOk = null; // null=unknown, true=connected, false=failed

export function getDbStatus() { return supabaseOk; }

export async function dbLoad(key) {
  const fullKey = PREFIX + key;

  if (supabase) {
    try {
      const { data, error } = await supabase.from('kv_store').select('value, updated_at').eq('key', fullKey).single();
      if (!error && data?.value) {
        supabaseOk = true;
        // Cache to localStorage (with timestamp)
        try { localStorage.setItem(fullKey, data.value); localStorage.setItem(fullKey + '_ts', data.updated_at || ''); } catch {}
        return JSON.parse(data.value);
      }
      if (error && error.code === 'PGRST116') {
        // No row found — empty DB, use sample data
        supabaseOk = true;
        return null;
      }
      console.warn('Supabase load error:', error?.message);
      supabaseOk = false;
    } catch (e) {
      console.warn('Supabase unreachable:', e.message);
      supabaseOk = false;
    }

    // Supabase exists but failed — localStorage as READ-ONLY fallback
    // Will NOT write back to Supabase (supabaseOk=false prevents it)
    try {
      const raw = localStorage.getItem(fullKey);
      if (raw) {
        console.warn('Using cached localStorage data (read-only until Supabase reconnects)');
        return JSON.parse(raw);
      }
    } catch {}
    return null;
  }

  // No Supabase configured — pure localStorage mode
  supabaseOk = true;
  try {
    const raw = localStorage.getItem(fullKey);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function dbSave(key, value) {
  const fullKey = PREFIX + key;
  const json = JSON.stringify(value);

  // Always save to localStorage (instant local cache)
  try { localStorage.setItem(fullKey, json); } catch {}

  // Debounced save to Supabase — ONLY if last connection was OK
  if (supabase && supabaseOk) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        const { error } = await supabase.from('kv_store').upsert({ key: fullKey, value: json });
        if (error) { console.error('Supabase save failed:', error.message); supabaseOk = false; }
        else { supabaseOk = true; }
      } catch (e) { console.error('Supabase save error:', e.message); supabaseOk = false; }
    }, 500);
  }
}

export async function dbDelete(key) {
  const fullKey = PREFIX + key;
  try { localStorage.removeItem(fullKey); localStorage.removeItem(fullKey + '_ts'); } catch {}
  if (supabase && supabaseOk) {
    try { await supabase.from('kv_store').delete().eq('key', fullKey); } catch {}
  }
}
