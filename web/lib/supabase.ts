'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// 환경변수가 없으면 null — 앱은 Supabase 없이도 완전히 동작해야 한다(정적 우선).
let client: SupabaseClient | null | undefined;
export function supabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key) : null;
  return client;
}

export type CandidateReview = {
  id?: number;
  candidate_id: string;
  verdict: 'confirmed_change' | 'no_change' | 'cloud' | 'unsure';
  note: string;
  author: string;
  created_at?: string;
};
