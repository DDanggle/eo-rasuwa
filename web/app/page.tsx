'use client';
/* eslint-disable @next/next/no-img-element -- sealed research rasters are intentionally served without image transformation */
import { useEffect, useState } from 'react';

// 첫 화면(2026-08-30 개편): 메시지 하나 — 100개 창 → 47개 판독 가능 → 6곳 우선 검토. 증거 전체는 /map 과 STORY 로.
type Lead = { id: string; rank: number; place: string; kind: string; candidate_token_frac: number; candidate_token_frac_single_pair: number | null; observable: number; center_lonlat: [number, number]; images: { pre: string; post: string; delta: string }; external_reports: { urls: string[]; verified_by_this_build: boolean } };
type Review = { funnel: { scanned: number; observable: number; leads: number; confirmed_damage_labels: number }; by_zone: Record<string, { total: number; observable: number }>; threshold: number | null; leads: Lead[]; reobserve: { id: string; place: string; candidate_token_frac: number; observable: number; images: { pre: string; post: string; delta: string } }[]; download: string; all_observable_download?: string; posthoc_note: string };
type Scenario = { generated_at: string; review?: Review | null; placebo_extended?: { threshold_pooled3: number } | null };

export default function Landing() {
  const [sc, setSc] = useState<Scenario | null>(null);
  const [ko, setKo] = useState(true);
  const [swipe, setSwipe] = useState(50);
  useEffect(() => { document.body.classList.add('page-scroll'); return () => document.body.classList.remove('page-scroll'); }, []);
  useEffect(() => { fetch('/data/scenario.json').then((r) => r.json() as Promise<Scenario>).then(setSc).catch(() => undefined); }, []);
  const rv = sc?.review ?? null; const lead = rv?.leads[0];
  const pct = (x: number | null | undefined) => x == null ? '—' : `${(100 * x).toFixed(0)}%`;
  return (
    <main className="landing">
      <nav className="landing-nav">
        <span className="brand">Nepal <b>AI Twin</b> · Rasuwa flash flood · 26 Aug 2026</span>
        <div><button className={!ko ? 'is-active' : ''} onClick={() => setKo(false)}>EN</button><button className={ko ? 'is-active' : ''} onClick={() => setKo(true)}>한국어</button><a href="/story" className="nav-link">STORY</a><a href="/map" className="nav-link">OPEN FULL EVIDENCE MAP →</a></div>
      </nav>

      <section className="hero">
        <p className="kicker">{ko ? '재난 전용 모델을 학습하지 않은, 범용 지구 임베딩 모델의 재사용' : 'A general Earth-embedding model, reused — no disaster-specific detector was trained'}</p>
        <h1>{ko ? <>위성 관측창 <em>100개.</em><br />먼저 확인할 곳 <em>6곳.</em></> : <><em>100</em> satellite windows.<br /><em>6</em> places to inspect first.</>}</h1>
        <p className="sub">{ko ? <>사건 전후의 센티넬 관측을 범용 지구 임베딩 모델(<a href="https://huggingface.co/allenai/OlmoEarth-v1-Base" target="_blank" rel="noreferrer">Ai2 OlmoEarth v1 Base</a>, 학습 없이 사용)로 비교해, 평소 변화보다 크게 달라진 장소만 남겼습니다. “달라진 곳”이 아니라 “평소보다 더 달라진 곳”입니다.</> : <>A general Earth-embedding model — <a href="https://huggingface.co/allenai/OlmoEarth-v1-Base" target="_blank" rel="noreferrer">Ai2&apos;s OlmoEarth v1 Base</a>, used frozen — compares before-and-after Sentinel observations with each place&apos;s ordinary change. Not &quot;what changed&quot; — &quot;what changed more than it usually does.&quot;</>}</p>
        <div className="funnel" role="img" aria-label="100 scanned, 47 observable, 6 review leads, 0 confirmed damage labels">
          <div><b>{rv?.funnel.scanned ?? 100}</b><span>{ko ? '스캔한 창' : 'scanned'}</span></div><i>→</i>
          <div><b>{rv?.funnel.observable ?? 47}</b><span>{ko ? '판독 가능' : 'observable'}</span></div><i>→</i>
          <div className="lead"><b>{rv?.funnel.leads ?? 6}</b><span>{ko ? '우선 검토' : 'review leads'}</span></div><i>·</i>
          <div className="zero"><b>0</b><span>{ko ? '확정 피해 라벨' : 'confirmed damage labels'}</span></div>
        </div>
        <div className="cta">
          <a href="/map" className="btn primary">{ko ? '후보 6곳 탐색' : 'EXPLORE 6 CANDIDATES'}</a>
          <a href={rv?.all_observable_download ?? '/data/candidates.geojson'} className="btn" download>{ko ? '측정된 47곳 GeoJSON 내려받기(후보 순)' : 'DOWNLOAD ALL 47 WINDOWS (RANKED GEOJSON)'}</a>
          <a href="https://github.com/DDanggle/eo_olmo_earth_project" className="btn" target="_blank" rel="noreferrer">GITHUB ↗</a>
        </div>
      </section>

      <section className="how">
        <p className="kicker">{ko ? '어떻게 작동하나' : 'HOW IT WORKS'}</p>
        <div className="how-grid">
          <div className="story-swipe landing-swipe" style={{ ['--swipe' as string]: `${swipe}%` }}>
            <img src={lead?.images.post ?? '/data/candidates/v003_post.png'} alt="after, 27 Aug" />
            <div className="swipe-clip"><img src={lead?.images.pre ?? '/data/candidates/v003_pre.png'} alt="before, 12 Aug" /></div>
            <div className="swipe-bar" /><span className="swipe-label pre">{ko ? '사건 전 · 8월 12일' : 'BEFORE · 12 Aug'}</span><span className="swipe-label post">{ko ? '사건 후 · 8월 27일' : 'AFTER · 27 Aug'}</span>
            <input type="range" min={0} max={100} value={swipe} aria-label="Compare before and after" onChange={(e) => setSwipe(Number(e.target.value))} />
          </div>
          <figure><img src={lead?.images.delta ?? '/data/candidates/v003_delta.png'} alt="embedding change" /><figcaption><b>{ko ? '임베딩 변화' : 'EMBEDDING CHANGE'}</b>{ko ? ' — 평소 범위를 넘은 40 m 토큰(주황). 왼쪽 손잡이를 끌어 전후를 비교하세요.' : ' — 40 m tokens beyond their ordinary range (orange). Drag the handle on the left to compare.'}</figcaption></figure>
        </div>
        <ul className="plain">
          <li><b>Δz</b> — {ko ? '같은 장소가 사건 전후에 얼마나 달라졌는지를 AI 임베딩으로 측정한 값' : 'how much the same place changed before vs after, measured in the AI embedding'}</li>
          <li><b>placebo</b> — {ko ? '사건이 없던 일반적인 기간(5~8월)에도 같은 장소가 얼마나 달라지는지 측정한 값 — 이것이 “평소 변화”의 기준' : 'how much the same place changes in ordinary periods without an event (May–August) — the baseline for "ordinary change"'}</li>
          <li><b>{ko ? '평소보다 다르게 보이는 비율' : 'share unlike its ordinary self'}</b> — {ko ? '한 창(2.56 km) 안에서 평소 변화 범위를 넘어선 40 m 격자의 비율. 표의 숫자가 이것이며, 피해 면적이 아닙니다.' : 'the share of 40 m cells in a 2.56 km window that moved beyond their ordinary range. This is the number in the table; it is not a damaged area.'}</li>
        </ul>
      </section>

      {lead && (
      <section className="example">
        <p className="kicker">{ko ? '가장 설득력 있는 사례 하나' : 'ONE CONVINCING EXAMPLE'}</p>
        <div className="example-grid">
          <figure><img src={lead.images.pre} alt="pre" /><figcaption>PRE 12 Aug</figcaption></figure>
          <figure><img src={lead.images.post} alt="post" /><figcaption>POST 27 Aug</figcaption></figure>
          <figure><img src={lead.images.delta} alt="delta" /><figcaption>AI Δ</figcaption></figure>
          <div className="example-text">
            <h2>#{lead.rank} {lead.place}</h2>
            <p>{ko ? `이 2.56 km 창의 40 m 격자 중 ${pct(lead.candidate_token_frac)}가 평소 변화 기준값을 넘어 달라졌고, 27일 영상은 ${pct(lead.observable)}가 구름 없이 관측됐습니다. 빙하가 무너져 산사태가 시작된 지점을 기준으로 강을 따라 흘러내린 구간에 있으며, 실제 피해 여부가 더 의심되는 곳으로 보입니다.` : `In ${pct(lead.candidate_token_frac)} of this 2.56 km window's 40 m cells the before/after embedding distance Δz exceeded the ordinary 99th-percentile threshold, and ${pct(lead.observable)} of the 27 Aug scene was cloud-free. About six kilometres down the river corridor from the border impact, this broad valley floor is the first place for a person to check—not a confirmed deposit.`}</p>
            <dl><div><dt>{ko ? '임베딩 기준 이상 비율' : 'share unlike its ordinary self'}</dt><dd>{pct(lead.candidate_token_frac)}</dd></div><div><dt>{ko ? '관측된 비율(구름 제외)' : 'observed share (cloud-free)'}</dt><dd>{pct(lead.observable)}</dd></div><div><dt>{ko ? '평소 변화 기준값(코사인 거리)' : 'ordinary-change reference (cosine distance)'}</dt><dd>{rv?.threshold?.toFixed(3) ?? '—'}</dd></div></dl>
          </div>
        </div>
      </section>
      )}

      {rv && (
      <section className="leads">
        <p className="kicker">{ko ? '우선 검토 6곳 · 세 가지 증거를 나란히' : 'SIX REVIEW LEADS · three kinds of evidence side by side'}</p>
        <table>
          <thead><tr><th>#</th><th>{ko ? '장소' : 'place'}</th><th>{ko ? '평소보다 다르게 보이는 비율' : 'share unlike its ordinary self'}<small>{ko ? '평소 변화 범위를 넘은 40 m 격자의 비율' : 'share of 40 m cells beyond their ordinary range'}</small></th><th>{ko ? '관측된 비율' : 'observed share'}<small>{ko ? '27일 영상에서 구름 없이 보인 부분' : 'cloud-free part of the 27 Aug scene'}</small></th><th>{ko ? '외부 보고(사후 대조)' : 'external reports (post-hoc)'}</th></tr></thead>
          <tbody>{rv.leads.map((l) => <tr key={l.id}><td>{l.rank}</td><td><a className="place-link" href={`/map?focus=${l.id}`}>{l.place}</a><small>{l.id} · {l.kind}</small></td><td><i style={{ width: `${Math.min(100, 100 * l.candidate_token_frac / 0.15)}%` }} />{pct(l.candidate_token_frac)}</td><td>{pct(l.observable)}{l.observable < 0.6 && <small>{ko ? ' 절반 가까이 구름' : ' partly cloud'}</small>}</td><td>{l.external_reports.urls.length ? l.external_reports.urls.map((u, i) => <a key={u} href={u} target="_blank" rel="noreferrer">{new URL(u).hostname.replace('www.', '')}{i < l.external_reports.urls.length - 1 ? ' · ' : ''}</a>) : <span className="muted">—</span>}</td></tr>)}</tbody>
        </table>
        <p className="note">{ko ? '외부 보고는 순위를 낸 뒤에 대조했고 순위 조정에 쓰지 않았습니다. 링크는 제공받은 것이며 이 빌드가 독립 검증하지 않았습니다. 이 시스템은 피해를 확정하지 않습니다 — 사람이 먼저 볼 곳을 좁힙니다.' : rv.posthoc_note + ' The system does not confirm damage — it narrows where people should look first.'}</p>
        {rv.reobserve.length > 0 && <p className="note">{ko ? '판단 보류(구름): ' : 'Held for re-observation (cloud): '}{rv.reobserve.map((r, i) => <span key={r.id}>{i ? ' · ' : ''}<a href={`/map?focus=${r.id}`}>{r.place}</a> ({ko ? `평소와 다른 비율 ${pct(r.candidate_token_frac)}, 관측 ${pct(r.observable)}` : `${pct(r.candidate_token_frac)} unlike ordinary, ${pct(r.observable)} observed`})</span>)}{ko ? ' — 다음 맑은 광학 또는 레이더로 먼저 재관측할 산사면.' : ' — hillslopes to re-observe first with the next clear optical pass or radar.'}</p>}
        <p className="note">{ko ? `탐색 범위: 강 회랑 ${rv.by_zone.river?.total ?? 41}창(판독 ${rv.by_zone.river?.observable ?? 39}), 주변 산사면 ${rv.by_zone.hillslope?.total ?? 49}창(판독 ${rv.by_zone.hillslope?.observable ?? 6}), 렌데 상류 ${rv.by_zone.lhende?.total ?? 10}창(판독 ${rv.by_zone.lhende?.observable ?? 2}). 결과가 강에 몰린 것은 강만 봤기 때문이 아니라 사건 후 광학영상에서 강 회랑이 훨씬 잘 보였기 때문입니다.` : `Search extent: ${rv.by_zone.river?.total ?? 41} river windows (${rv.by_zone.river?.observable ?? 39} observable), ${rv.by_zone.hillslope?.total ?? 49} hillslope windows (${rv.by_zone.hillslope?.observable ?? 6}), ${rv.by_zone.lhende?.total ?? 10} upstream Lhende windows (${rv.by_zone.lhende?.observable ?? 2}). Results cluster on the river not because only the river was searched, but because the river corridor was far better observed after the event.`}</p>
      </section>
      )}

      <section className="reuse" id="reuse">
        <p className="kicker">{ko ? '재사용' : 'REUSE THIS RECIPE'}</p>
        <h2>{ko ? '다른 홍수·산사태·산림 변화에도 같은 입력 계약과 임베딩 비교법을 적용할 수 있습니다' : 'The same input contract and embedding comparison apply to other floods, landslides and forest change'}</h2>
        <table className="io"><thead><tr><th>{ko ? '넣는 것' : 'you provide'}</th><th>{ko ? '받는 것' : 'you get'}</th></tr></thead><tbody>
          <tr><td>{ko ? 'AOI + 사건 전후 Sentinel-2 장면(12밴드, 10 m)' : 'AOI + before/after Sentinel-2 scenes (12 bands, 10 m)'}</td><td>{ko ? '후보 순위 GeoJSON' : 'ranked candidate GeoJSON'}</td></tr>
          <tr><td>{ko ? '지구 임베딩 모델(OlmoEarth v1 Base, 추가 학습 없음)' : 'Earth-embedding model (OlmoEarth v1 Base, frozen — no training)'}</td><td>{ko ? '창별 PRE · POST · AI Δ 이미지' : 'PRE · POST · AI Δ image per window'}</td></tr>
          <tr><td>{ko ? '서로 맞춘 평시 변화 3개(2주 간격)' : 'three matched ordinary fortnight transitions'}</td><td>{ko ? '후보별 변화값·관측 가능성·감사 기록(SHA-256)' : 'per-candidate change, observability and an audit record (SHA-256)'}</td></tr>
        </tbody></table>
        <div className="cta"><a href="/story" className="btn">{ko ? '방법과 근거 전체 읽기' : 'METHODS & FULL EVIDENCE'}</a><a className="btn" href="https://github.com/DDanggle/eo_olmo_earth_project" target="_blank" rel="noreferrer">CODE ↗</a></div>
      </section>

      <footer className="landing-foot">
        <div className="foot-cols">
          <div>
            <b>{ko ? '산사태·홍수 피해 장소 후보 찾기, 하지만' : 'Finding candidate damage sites — with a limit'}</b>
            <p>{ko ? '피해 후보군을 찾지만 피해 범위나 장소를 명확하게 확정하지는 못합니다. 주변 100곳 중 피해가 있을 만한 장소를 고르는 것이며, AI가 위성 관측과 임베딩 비교로 낸 후보군일 뿐 면적이나 원인을 결정짓지 않습니다. 새로운 재난마다 모델을 다시 학습하지 않습니다.' : 'This page finds candidates; it does not confirm damage. Instead of looking at 100 places, people learn where to look first, and no model is retrained for each new disaster. Every number here is a review priority derived from satellite observations and embedding comparison — not a damaged area, a cause or a probability.'}</p>
          </div>
          <div>
            <b>{ko ? '모델과 자료' : 'Model and data'}</b>
            <p>{ko ? <>AI 모델은 Ai2가 공개한 <a href="https://huggingface.co/allenai/OlmoEarth-v1-Base" target="_blank" rel="noreferrer">OlmoEarth v1 Base</a>를 추가 학습 없이 그대로 썼습니다. 위성 영상은 ESA Sentinel-1·2, 고해상도 참고 영상은 Planet Labs의 Planet Disaster Data(CC-BY-NC-4.0), 지형은 Copernicus DEM, 지도는 MapTiler·OpenStreetMap입니다.</> : <>The AI model is <a href="https://huggingface.co/allenai/OlmoEarth-v1-Base" target="_blank" rel="noreferrer">OlmoEarth v1 Base</a>, released with open weights by Ai2 and used here frozen. Satellite data are ESA Copernicus Sentinel-1 and Sentinel-2; high-resolution reference imagery is Planet Disaster Data by Planet Labs PBC (CC-BY-NC-4.0). Terrain is Copernicus DEM GLO-30; basemap © MapTiler and OpenStreetMap contributors.</>}</p>
          </div>
          <div>
            <b>{ko ? '사건과 상태' : 'Event and status'}</b>
            <p>{ko ? `2026년 8월 26일, 네팔 라수와 군 랑탕 리룽의 빙하와 암반이 무너지며 시작된 돌발 산사태·홍수입니다. 원인은 아직 조사 중이며 이 페이지는 원인을 판정하지 않습니다. LAST UPDATE ${sc ? new Date(sc.generated_at).toISOString().slice(0, 10) : ''}. 코드와 실험 기록은 GitHub에 있습니다.` : `Flash flood of 26 August 2026 in Rasuwa district, Nepal, starting on Langtang Lirung. The cause is under investigation (suspected rock–ice avalanche); this page does not adjudicate it. LAST UPDATE ${sc ? new Date(sc.generated_at).toISOString().slice(0, 10) : ''}. Code and the measurement ledger (M66–M85) are on GitHub.`} <a href="https://github.com/DDanggle/eo_olmo_earth_project" target="_blank" rel="noreferrer">github ↗</a></p>
          </div>
          <div>
            <b>{ko ? '돕고 싶다면' : 'How to help'}</b>
            <p>{ko ? <>이 페이지는 개인 분석 프로젝트이며 기부를 받지 않습니다. 긴급 구호와 관련한 공식 페이지가 열려 있습니다 — 꼭 확인해보세요: <a href="https://www.icrc.org/en/donate" target="_blank" rel="noreferrer">ICRC</a>·<a href="https://www.ifrc.org/emergency/nepal-flash-floods-2026" target="_blank" rel="noreferrer">IFRC ↗</a> / <a href="https://donation.nrcs.org/" target="_blank" rel="noreferrer">네팔 적십자사</a>·<a href="https://www.unicef.org/nepal/flooding-nepal-2026-0" target="_blank" rel="noreferrer">UNICEF ↗</a></> : <>This is a personal analysis project and accepts no donations. Official emergency-relief pages are open — please have a look: <a href="https://www.icrc.org/en/donate" target="_blank" rel="noreferrer">ICRC</a>·<a href="https://www.ifrc.org/emergency/nepal-flash-floods-2026" target="_blank" rel="noreferrer">IFRC ↗</a> / <a href="https://donation.nrcs.org/" target="_blank" rel="noreferrer">Nepal Red Cross</a>·<a href="https://www.unicef.org/nepal/flooding-nepal-2026-0" target="_blank" rel="noreferrer">UNICEF ↗</a></>}</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
