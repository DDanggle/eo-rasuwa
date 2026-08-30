'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase, type CandidateReview } from '../lib/supabase';

// 사람 검토 기록 — AI 후보(창 id)에 대해 "변화 확인 / 변화 없음 / 구름 / 모름" 과 메모를 남긴다.
// 이 기록은 판정이 아니라 검토 큐의 상태다. Supabase 미설정이면 렌더하지 않는다.
export function ReviewNotes({ candidateIds }: { candidateIds: string[] }) {
  const sb = supabase();
  const [rows, setRows] = useState<CandidateReview[]>([]);
  const [cid, setCid] = useState(candidateIds[0] ?? '');
  const [verdict, setVerdict] = useState<CandidateReview['verdict']>('unsure');
  const [note, setNote] = useState('');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState<string>('');

  const load = useCallback(async () => {
    if (!sb) return;
    const { data, error } = await sb.from('candidate_reviews').select('*').order('created_at', { ascending: false }).limit(50);
    if (!error && data) setRows(data as CandidateReview[]);
  }, [sb]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!cid && candidateIds[0]) setCid(candidateIds[0]); }, [candidateIds, cid]);

  if (!sb) return null;
  const submit = async () => {
    if (!cid || !note.trim()) { setStatus('Pick a window and write a note.'); return; }
    setStatus('Saving…');
    const { error } = await sb.from('candidate_reviews').insert({ candidate_id: cid, verdict, note: note.trim().slice(0, 1000), author: author.trim().slice(0, 80) || 'anonymous' });
    if (error) { setStatus(`Not saved: ${error.message}`); return; }
    setNote(''); setStatus('Saved.'); void load();
  };
  return (
    <div className="review-notes">
      <span className="ops-title">HUMAN REVIEW · notes on AI candidates</span>
      <div className="review-form">
        <select value={cid} onChange={(e) => setCid(e.target.value)} aria-label="Candidate window">{candidateIds.map((id) => <option key={id} value={id}>{id}</option>)}</select>
        <select value={verdict} onChange={(e) => setVerdict(e.target.value as CandidateReview['verdict'])} aria-label="Verdict">
          <option value="confirmed_change">change confirmed</option><option value="no_change">no change</option><option value="cloud">cloud / unreadable</option><option value="unsure">unsure</option>
        </select>
        <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="name (optional)" aria-label="Your name" />
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="what you see in the pre/post pair, and where" rows={2} aria-label="Note" />
        <button type="button" onClick={() => void submit()}>Save note</button>
        {status && <small>{status}</small>}
      </div>
      <div className="review-list">
        {rows.map((r) => <div key={r.id ?? `${r.candidate_id}-${r.created_at}`}><b>{r.candidate_id}</b> <em>{r.verdict.replace('_', ' ')}</em> · {r.author}<small>{r.note}</small></div>)}
        {rows.length === 0 && <small>No notes yet.</small>}
      </div>
    </div>
  );
}
