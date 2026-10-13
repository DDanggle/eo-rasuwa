'use client';
/* eslint-disable @next/next/no-img-element -- scientific images are served from the existing sealed data bundle */
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { evidenceBrief, exportSelection, parseNotes, type DecisionData, type ReviewNotes, type ReviewStatus } from './model';
import styles from './workspace.module.css';

const EvidenceMap = dynamic(() => import('./evidence-map'), { ssr: false, loading: () => <div className={styles.mapLoading}>Loading observation map…</div> });
const percent = (value: number) => `${(100 * value).toFixed(1)}%`;
const download = (name: string, text: string, type: string) => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.append(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function DecisionWorkspace({ data }: { data: DecisionData }) {
  const [ko, setKo] = useState(true);
  const t = (en: string, kr: string) => ko ? kr : en;
  const published = useMemo(() => data.windows.filter(w => w.leadRank !== null), [data]);
  const [active, setActive] = useState(published[0]?.id ?? data.windows[0].id);
  const [selected, setSelected] = useState<string[]>(published.map(w => w.id));
  const [notes, setNotes] = useState<ReviewNotes>({});
  const [queue, setQueue] = useState<'leads' | 'all' | 'reobserve'>('leads');
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<'change' | 'coverage'>('change');
  const [message, setMessage] = useState('');
  const storageKey = `nepal-decision-support:${data.sourceVersion}`;
  useEffect(() => {
    document.body.classList.add('page-scroll');
    try {
      const raw = window.localStorage.getItem(storageKey);
      const saved = raw ? JSON.parse(raw) : null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore browser-local review only after hydration
      setNotes(parseNotes(saved ? JSON.stringify(saved.notes) : null, data.windows.map(w => w.id)));
      if (Array.isArray(saved?.selected)) setSelected([...new Set<string>(saved.selected.filter((id: unknown) => typeof id === 'string' && data.windows.some(w => w.id === id)))]);
      const m = document.cookie.match(/(?:^|; )lang=(ko|en)/); setKo(m ? m[1] === 'ko' : navigator.language.toLowerCase().startsWith('ko'));
    } catch { setMessage('Local storage unavailable. You can still review and download this session. / 브라우저 저장을 사용할 수 없어 현재 세션에서만 유지됩니다.'); }
    return () => document.body.classList.remove('page-scroll');
  }, [storageKey, data.windows]);
  const persist = (nextNotes: ReviewNotes, nextSelected: string[]) => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ notes: nextNotes, selected: nextSelected }));
      setMessage(t('Saved in this browser only.', '이 브라우저에만 저장했습니다.'));
    } catch { setMessage(t('Storage is unavailable. Download your work before leaving.', '브라우저 저장이 불가능합니다. 페이지를 떠나기 전에 내려받으세요.')); }
  };
  const choose = (ids: string[]) => { setSelected(ids); persist(notes, ids); };
  const toggle = (id: string) => choose(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  const current = data.windows.find(w => w.id === active)!;
  const note = notes[active] ?? { status: 'unreviewed' as const, note: '' };
  const editNote = (change: Partial<{ status: ReviewStatus; note: string }>) => {
    const next = { ...notes, [active]: { ...note, ...change } };
    setNotes(next); persist(next, selected);
  };
  const visible = useMemo(() => data.windows.filter(w =>
    (queue === 'all' || (queue === 'leads' ? w.leadRank !== null : data.reobserveIds.includes(w.id))) &&
    `${w.place} ${w.id}`.toLowerCase().includes(query.toLowerCase().trim())
  ).sort((a, b) => order === 'coverage' ? a.observed - b.observed || a.id.localeCompare(b.id) : b.change - a.change || a.id.localeCompare(b.id)), [data, queue, query, order]);
  const selection = data.windows.filter(w => selected.includes(w.id));
  const statuses: [ReviewStatus, string, string][] = [
    ['unreviewed', 'Not reviewed', '미검토'], ['imagery', 'Request more imagery', '추가 영상 필요'],
    ['field-check', 'Needs field assessment', '현장 확인 필요'], ['hold', 'On hold', '보류'], ['reviewed', 'Reviewed', '검토 완료'],
  ];
  const exportData = () => {
    download('nepal-review-selection.geojson', JSON.stringify(exportSelection(data, selected, notes, new Date().toISOString()), null, 2), 'application/geo+json');
    setMessage(t('GeoJSON exported with source hashes, limitations, and your notes.', '출처 해시·한계·메모를 포함한 GeoJSON을 내려받았습니다.'));
  };
  const exportBrief = () => {
    download('nepal-evidence-brief.md', evidenceBrief(data, selected, notes, new Date().toISOString()), 'text/markdown;charset=utf-8');
    setMessage(t('English evidence brief exported. Your notes are kept as written.', '영문 근거 브리프를 내려받았습니다. 메모는 입력한 언어로 유지됩니다.'));
  };

  return <main className={styles.shell} lang={ko ? 'ko' : 'en'}>
    <a className={styles.skip} href="#review-queue">{t('Skip to review list', '검토 목록으로 이동')}</a>
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>NEPAL <strong>AI TWIN</strong><span> / GEO EVIDENCE</span></Link>
      <nav aria-label={t('Page navigation', '페이지 탐색')}><a href="/map">{t('Evidence map ↗', '분석 지도 ↗')}</a><a href="#delivery">{t('Your review list', '내 검토 목록')}</a>
        <button aria-pressed={!ko} onClick={() => { setKo(false); try { document.cookie = 'lang=en;path=/;max-age=31536000'; } catch { /* noop */ } }}>EN</button><button aria-pressed={ko} onClick={() => { setKo(true); try { document.cookie = 'lang=ko;path=/;max-age=31536000'; } catch { /* noop */ } }}>한국어</button>
      </nav>
    </header>

    <section className={styles.intro}>
      <div><p className={styles.eyebrow}>DECISION SUPPORT · RASUWA, NEPAL</p>
        <h1>{t('From observation', '관측에서')}<br /><em>{t('to the next decision.', '다음 판단까지.')}</em></h1>
        <p className={styles.subtitle}>{t('Compare the evidence. Choose where to look next. Deliver a review brief with its sources intact.', '관측 근거를 비교하고, 다음에 확인할 곳을 선택하세요. 판단의 출처를 담아 검토 자료로 전달합니다.')}</p>
      </div>
      <aside className={styles.context}><span className={styles.tag}>{t('WORKING PORTFOLIO DEMO', '작동하는 포트폴리오 데모')}</span>
        <p>{t('An independent GeoAI workflow developed for an ESCWA application. Uses actual Nepal research outputs; no ESCWA or UN affiliation or platform integration.', 'ESCWA 지원을 위해 구성한 독립 GeoAI 데모입니다. 실제 Nepal 연구 결과를 사용하며 ESCWA·UN의 공식 서비스나 연동 제품이 아닙니다.')}</p>
        <div><b>{t('Observation', '관측일')}</b><span>27 AUG 2026</span></div><div><b>{t('Method', '분석 방법')}</b><span>Frozen OlmoEarth · Sentinel-2</span></div>
      </aside>
    </section>

    <div className={styles.workflow} aria-label={t('Workflow', '진행 흐름')}><span><b>01</b>{t('Inspect coverage', '관측 범위 확인')}</span><span><b>02</b>{t('Review evidence', '근거 검토')}</span><span><b>03</b>{t('Choose & deliver', '선택하고 전달')}</span></div>
    <section className={styles.metrics} aria-label={t('Optical study summary', '광학 분석 요약')}>
      {[[data.counts.scanned, t('Sampled windows', '분석한 표본 창')], [data.counts.observable, t('Observable windows', '관측 가능한 창')], [data.counts.scanned - data.counts.observable, t('Unobservable windows', '관측 불가능한 창')], [data.counts.leads, t('Published review leads', '공개 검토 후보')]].map(([n, label]) => <div key={label}><strong>{n}</strong><span>{label}</span></div>)}
      <p>{t('Window counts, not land-area coverage. No field-validated damage labels.', '창 개수이며 지역 면적 비율이 아닙니다. 현장에서 검증된 피해 라벨은 없습니다.')}</p>
    </section>

    <section className={styles.workbench} aria-label={t('Review workspace', '검토 작업 공간')}>
      <div className={styles.left}>
        <EvidenceMap windows={data.windows} active={active} selected={selected} onPick={setActive} ko={ko} />
        <div className={styles.queue} id="review-queue">
          <div className={styles.sectionTop}><div><p className={styles.eyebrow}>01 / REVIEW QUEUE</p><h2>{t('Where to look next', '다음에 확인할 곳')}</h2></div><span>{visible.length} {t('shown', '표시')}</span></div>
          <div className={styles.tabs} role="group" aria-label={t('Review queue filter', '검토 목록 필터')}>
            {([['leads', t('Published leads', '공개 후보')], ['all', t('All observable', '관측된 모든 창')], ['reobserve', t('More observation needed', '추가 관측 우선')]] as const).map(([value, label]) => <button key={value} aria-pressed={queue === value} onClick={() => setQueue(value)}>{label}</button>)}
          </div>
          {queue === 'reobserve' && <p className={styles.helper}>{t('Two published re-observation priorities have limited readable pixels. They belong to the 47 observable windows; they are not the 53 unobservable windows.', '공개된 재관측 우선 2곳은 읽을 수 있는 영역이 제한적입니다. 관측된 47곳에 포함되며, 관측 불가능한 53곳의 목록은 아닙니다.')}</p>}
          <div className={styles.filters}><label><span>{t('Find a place', '장소 찾기')}</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('Place or window ID', '지명 또는 창 ID')} /></label>
            <label><span>{t('Sort by', '정렬 기준')}</span><select value={order} onChange={e => setOrder(e.target.value as 'change' | 'coverage')}><option value="change">{t('Change signal ↓', '변화 신호 높은 순')}</option><option value="coverage">{t('Observable share ↑', '관측 비율 낮은 순')}</option></select></label>
          </div>
          <div className={styles.list}>
            {visible.map(w => <div className={`${styles.row} ${active === w.id ? styles.active : ''}`} key={w.id}>
              <input type="checkbox" checked={selected.includes(w.id)} onChange={() => toggle(w.id)} aria-label={`${t('Include', '목록에 포함')}: ${w.place} (${w.id})`} />
              <button className={styles.rowMain} aria-pressed={active === w.id} onClick={() => setActive(w.id)}><span><b>{w.place}</b><small>{w.id} · {w.leadRank ? `${t('Published lead', '공개 후보')} #${w.leadRank}` : t('Observable window', '관측된 창')}</small></span><span className={styles.rowNumbers}><b>{percent(w.change)}</b><small>{t('change share', '기준 초과 비율')}</small></span><span className={styles.rowNumbers}><b>{percent(w.observed)}</b><small>{t('observable', '관측 비율')}</small></span></button>
            </div>)}
            {!visible.length && <p className={styles.empty}>{t('No places match this filter.', '조건에 맞는 장소가 없습니다.')} <button onClick={() => { setQuery(''); setQueue('all'); }}>{t('Show all observable windows', '관측된 모든 창 보기')}</button></p>}
          </div>
          <p className={styles.helper}>{t('Change share is the fraction of valid 40 m tokens above the ordinary-change threshold. It is not damage probability.', '변화 비율은 유효한 40 m 토큰 중 평시 변화 기준을 넘은 비율입니다. 피해 확률이 아닙니다.')}</p>
        </div>
      </div>

      <aside className={styles.evidence} aria-label={t('Selected place evidence', '선택한 장소의 근거')}>
        <p className={styles.eyebrow}>02 / EVIDENCE CARD</p><div className={styles.sectionTop}><h2>{current.place}</h2><span className={styles.tag}>{current.id}</span></div>
        <p className={styles.coords}>{current.center[1].toFixed(5)}° N · {current.center[0].toFixed(5)}° E</p>
        <div className={styles.images}>
          {([['pre', t('Before · 12 Aug', '사건 전 · 8월 12일')], ['post', t('After · 27 Aug', '사건 후 · 8월 27일')], ['delta', t('Embedding change', '임베딩 변화')]] as const).map(([image, label]) => <figure key={`${current.id}-${image}`}><img src={`/data/candidates/${current.id}_${image}.png`} alt={`${current.place}: ${label}`} /><figcaption>{label}</figcaption></figure>)}
        </div>
        <p className={styles.helper}>{t('The before image is illustrative. Scores use a baseline from 3 July, 23 July, and 7 August, compared with 27 August.', '사건 전 이미지는 참고용입니다. 점수는 7월 3일·23일·8월 7일 기준 관측과 8월 27일을 비교한 결과입니다.')}</p>
        <div className={styles.signals}><div><span>{t('Beyond ordinary change', '평시 변화 기준 초과')}</span><strong>{percent(current.change)}</strong><small>{t('of valid tokens', '유효 토큰 기준')}</small></div><div><span>{t('Observable share', '관측 가능한 비율')}</span><strong>{percent(current.observed)}</strong><small>{t('within this window', '이 분석 창 내부')}</small></div></div>
        <div className={styles.interpretation}><b>{t('What this supports', '이 근거로 할 수 있는 판단')}</b><p>{data.reobserveIds.includes(current.id) ? t('Prioritize another observation before drawing conclusions from this partially readable window.', '일부만 읽히는 창이므로 결론을 내리기 전에 추가 관측을 우선 검토하세요.') : current.leadRank ? t('A published lead for closer human inspection. Compare the images and record what still needs verification.', '사람이 자세히 확인하도록 공개한 후보입니다. 영상을 비교하고 추가 확인할 내용을 기록하세요.') : t('An observable comparison window. It was not selected among the six published leads.', '관측 가능한 비교 대상입니다. 공개된 우선 후보 6곳에는 포함되지 않았습니다.')}</p></div>
        <dl className={styles.contextList}><div><dt>{t('Damage confirmation', '피해 확인')}</dt><dd>{t('Not field-validated', '현장 검증 없음')}</dd></div><div><dt>{t('Facilities & population', '시설·인구 정보')}</dt><dd>{t('Not joined', '공간 결합 전')}</dd></div><div><dt>{t('Administrative indicator', '행정구역 지표')}</dt><dd>{t('Not computed', '미산출')}</dd></div></dl>
        <a className={styles.textLink} href={`/map?focus=${current.id}`} target="_blank" rel="noreferrer">{t('Open full evidence map ↗', '전체 분석 지도 열기 ↗')}</a>
        <div className={styles.noteBox}><h3>{t('Your next step', '다음 확인 사항')}</h3><label><span>{t('Review status', '검토 상태')}</span><select value={note.status} onChange={e => editNote({ status: e.target.value as ReviewStatus })}>{statuses.map(([value, en, kr]) => <option value={value} key={value}>{t(en, kr)}</option>)}</select></label><label><span>{t('Reason or verification needed', '선택 이유 또는 확인할 내용')}</span><textarea rows={3} maxLength={1000} value={note.note} onChange={e => editNote({ note: e.target.value })} placeholder={t('What should another analyst check here?', '다른 분석가가 무엇을 확인해야 하나요?')} /></label><p className={styles.helper}>{t('Notes stay in this browser and are included in your exports. “Reviewed” does not confirm damage.', '메모는 이 브라우저에 저장되며 내려받는 자료에 포함됩니다. 검토 완료가 피해 확인을 뜻하지는 않습니다.')}</p><button className={selected.includes(active) ? styles.secondary : styles.primary} onClick={() => toggle(active)}>{selected.includes(active) ? t('Remove from my review list', '내 검토 목록에서 제외') : t('Add to my review list', '내 검토 목록에 추가')}</button></div>
      </aside>
    </section>

    <section className={styles.delivery} id="delivery">
      <div className={styles.sectionTop}><div><p className={styles.eyebrow}>03 / DECISION & DELIVERY</p><h2>{t('Your review list', '내 검토 목록')} <span>{selection.length}</span></h2></div><div className={styles.smallActions}><button onClick={() => choose(published.map(w => w.id))}>{t('Select published leads', '공개 후보 선택')}</button><button disabled={!selected.length} onClick={() => choose([])}>{t('Clear selection', '선택 해제')}</button></div></div>
      <p>{t('Compare the places you chose, then deliver their evidence together. The six published leads are selected initially; your selection is not an automated response plan.', '선택한 장소들을 비교하고 근거를 함께 전달하세요. 처음에는 공개 후보 6곳이 선택됩니다. 이 목록은 사용자의 검토 선택이며 자동 대응 계획이 아닙니다.')}</p>
      {selection.length ? <div className={styles.tableWrap}><table><thead><tr>{[t('Place', '장소'), t('Change share', '기준 초과 비율'), t('Observable', '관측 비율'), t('Your status', '내 검토 상태'), t('Selection', '선택')].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{selection.map(w => <tr key={w.id}><td><button className={styles.textLink} onClick={() => { setActive(w.id); document.getElementById('review-queue')?.scrollIntoView({ behavior: 'auto', block: 'start' }); }}>{w.place}</button><small>{w.id}</small></td><td>{percent(w.change)}</td><td>{percent(w.observed)}</td><td>{(() => { const entry = statuses.find(x => x[0] === (notes[w.id]?.status ?? 'unreviewed'))!; return t(entry[1], entry[2]); })()}</td><td><button className={styles.remove} aria-label={`${t('Remove', '제외')}: ${w.place}`} onClick={() => toggle(w.id)}>×</button></td></tr>)}</tbody></table></div> : <div className={styles.empty}>{t('Choose at least one window to build your evidence package.', '근거 자료를 만들려면 분석 창을 한 곳 이상 선택하세요.')}</div>}
      <div className={styles.exportRow}><div><b>{t('One selection. Traceable outputs.', '한 번 선택하고, 근거와 함께 전달하세요.')}</b><p>{t('Includes scores, observation dates, source checksums, limitations, and your notes. No account required.', '점수·관측일·출처 체크섬·한계·검토 메모를 포함합니다. 계정 없이 내려받을 수 있습니다.')}</p></div><div className={styles.exportButtons}><button className={styles.secondary} disabled={!selection.length} onClick={exportData}>{t('Download GeoJSON ↓', 'GeoJSON 내려받기 ↓')}</button><button className={styles.primary} disabled={!selection.length} onClick={exportBrief}>{t('Download evidence brief ↓', '근거 브리프 내려받기 ↓')}</button></div></div>
      <p className={styles.status} role="status" aria-live="polite">{message || t('Review notes and selection are private to this browser until you share a download.', '검토 메모와 선택은 파일을 공유하기 전까지 이 브라우저에만 남습니다.')}</p>
    </section>

    <section className={styles.methods}><div><p className={styles.eyebrow}>METHOD & ACCOUNTABILITY</p><h2>{t('Keep the evidence attached.', '판단에 근거를 남깁니다.')}</h2><p>{t('Frozen OlmoEarth v1 Base encodes the same locations before and after the event. Windows are ordered by the share of valid tokens above the pooled p99 of three ordinary transitions.', 'Frozen OlmoEarth v1 Base로 사건 전후 같은 위치를 비교했습니다. 유효 토큰 중 세 평시 변화 쌍의 통합 p99 기준을 넘은 비율로 순서를 정합니다.')}</p><p>{t('Optical comparison intervals are not fully time-matched. The method did not outperform a strong post-event NDWI baseline in the token-scale external-proxy evaluation. This optical workflow is separate from the radar fusion experiment.', '광학 평시 비교의 시간 간격은 완전히 일치하지 않습니다. 토큰 단위 외부 참조 평가에서는 강한 사후 NDWI 기준선을 넘지 못했습니다. 이 광학 검토 흐름은 레이더 융합 실험과 별개입니다.')}</p><a className={styles.textLink} href="/story">{t('Read the research and corrections ↗', '연구 방법과 정정 이력 보기 ↗')}</a></div><div><h3>{t('What comes next', '다음 확장')}</h3><p>{t('Versioned administrative indicators, infrastructure context, and a retrospective Arab-region case would extend this workflow. They are proposed work, not results shown on this page.', '버전이 있는 행정구역 지표, 기반시설 정보, 아랍 지역의 회고적 사례 분석으로 확장할 수 있습니다. 이 항목들은 후속 계획이며 현재 페이지의 구현 결과가 아닙니다.')}</p><div className={styles.sourceBox}><span>SOURCE VERSION</span><code>{data.sourceVersion}</code><span>POOLED OPTICAL THRESHOLD</span><code>{data.threshold.toFixed(6)}</code><a href="/data/candidates.geojson">{t('Original observable windows ↗', '원본 관측 창 데이터 ↗')}</a><a href="/data/review-leads.geojson">{t('Original six review leads ↗', '원본 검토 후보 6곳 ↗')}</a></div></div></section>
    <footer className={styles.footer}><span>NEPAL AI TWIN · GEO EVIDENCE</span><p>{t('Independent portfolio demo. No ESCWA / UN affiliation or endorsement. Data: ESA Copernicus Sentinel-2. Model: Ai2 OlmoEarth. Built by Donggeun Yi.', '독립 포트폴리오 데모이며 ESCWA·UN과 제휴하거나 승인을 받은 서비스가 아닙니다. 데이터: ESA Copernicus Sentinel-2 · 모델: Ai2 OlmoEarth · 제작: Donggeun Yi.')}</p><a href="https://github.com/DDanggle/eo-rasuwa" target="_blank" rel="noreferrer">{t('Code & methodology ↗', '코드와 방법론 ↗')}</a></footer>
  </main>;
}
