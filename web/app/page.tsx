'use client';
import { useEffect, useState } from 'react';

// 첫 화면(2026-08-30 개편): 메시지 하나 — 100개 창 → 47개 판독 가능 → 6곳 우선 검토. 증거 전체는 /map 과 STORY 로.
type Lead = { id: string; rank: number; place: string; kind: string; candidate_token_frac: number; candidate_token_frac_single_pair: number | null; observable: number; center_lonlat: [number, number]; images: { pre: string; post: string; delta: string }; external_reports: { urls: string[]; verified_by_this_build: boolean } };
type Review = { funnel: { scanned: number; observable: number; leads: number; confirmed_damage_labels: number }; by_zone: Record<string, { total: number; observable: number }>; threshold: number | null; leads: Lead[]; reobserve: { id: string; place: string; candidate_token_frac: number; observable: number; images: { pre: string; post: string; delta: string } }[]; download: string; posthoc_note: string };
type Scenario = { generated_at: string; review?: Review | null; placebo_extended?: { threshold_pooled3: number } | null };

export default function Landing() {
  const [sc, setSc] = useState<Scenario | null>(null);
  const [ko, setKo] = useState(false);
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
          <a href={rv?.download ?? '/data/candidates.geojson'} className="btn" download>{ko ? '후보 GeoJSON 내려받기' : 'DOWNLOAD CANDIDATE GEOJSON'}</a>
          <a href="#reuse" className="btn">{ko ? '이 방법 재사용하기' : 'REUSE THIS RECIPE'}</a>
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
          <li><b>Δz</b> — {ko ? '같은 장소가 사건 전후에 얼마나 다르게 표현됐는가' : 'how differently the same place is represented before and after'}</li>
          <li><b>placebo</b> — {ko ? '사건이 없던 평범한 기간에도 보통 얼마나 달라지는가(세 개의 2주 쌍)' : 'how much it usually differs across ordinary fortnights (three pairs)'}</li>
          <li><b>{ko ? '초과 비율' : 'exceedance'}</b> — {ko ? '한 창(2.56 km, 64×64 격자) 안에서 Δz가 평시 99퍼센타일을 넘은 40 m 격자의 비율. 표의 “임베딩 변화 초과 비율”이 이것이다. 피해 면적이 아니다.' : 'the share of 40 m cells in a 2.56 km window (64×64 cells) whose Δz exceeds the ordinary 99th percentile. This is the number in the table. It is not a damaged area.'}</li>
          <li><b>{ko ? '판정' : 'rule'}</b> — {ko ? '사건 변화가 평시 변화의 99퍼센타일을 넘을 때만 검토 후보로 남긴다' : 'a token is a candidate only when the event change exceeds the 99th percentile of ordinary change'}</li>
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
            <p>{ko ? `이 2.56 km 창의 40 m 격자 중 ${pct(lead.candidate_token_frac)}에서 사건 전후 임베딩 거리 Δz가 평시 99퍼센타일 문턱을 넘었고, 27일 영상 격자의 ${pct(lead.observable)}가 구름 없이 판독됐습니다. 강 회랑 6 km 아래, 국경 충격 지점에서 토사가 넓은 계곡 바닥에 깔린 구간입니다.` : `In ${pct(lead.candidate_token_frac)} of this 2.56 km window's 40 m cells the before/after embedding distance Δz exceeded the ordinary 99th-percentile threshold, and ${pct(lead.observable)} of the 27 Aug scene was cloud-free. Six kilometres below the border impact, this is where debris spread across a wide valley floor.`}</p>
            <dl><div><dt>{ko ? '임베딩 변화 초과 비율' : 'exceedance (cells with Δz > ordinary p99)'}</dt><dd>{pct(lead.candidate_token_frac)}</dd></div><div><dt>{ko ? '관측 가능 비율(구름 제외)' : 'cloud-free share'}</dt><dd>{pct(lead.observable)}</dd></div><div><dt>{ko ? '평시 p99 문턱(코사인 거리)' : 'ordinary p99 threshold (cosine distance)'}</dt><dd>{rv?.threshold?.toFixed(3) ?? '—'}</dd></div></dl>
          </div>
        </div>
      </section>
      )}

      {rv && (
      <section className="leads">
        <p className="kicker">{ko ? '우선 검토 6곳 · 세 가지 증거를 나란히' : 'SIX REVIEW LEADS · three kinds of evidence side by side'}</p>
        <table>
          <thead><tr><th>#</th><th>{ko ? '장소' : 'place'}</th><th>{ko ? '임베딩 변화 초과 비율' : 'embedding-change exceedance'}<small>{ko ? 'Δz > 평시 p99 인 40 m 격자의 비율' : 'share of 40 m cells with Δz above the ordinary 99th percentile'}</small></th><th>{ko ? '관측 가능 비율' : 'cloud-free share'}<small>{ko ? '27일 장면 중 구름 아닌 격자(SCL)' : 'cells of the 27 Aug scene not cloud (SCL)'}</small></th><th>{ko ? '외부 보고(사후 대조)' : 'external reports (post-hoc)'}</th></tr></thead>
          <tbody>{rv.leads.map((l) => <tr key={l.id}><td>{l.rank}</td><td>{l.place}<small>{l.id} · {l.kind}</small></td><td><i style={{ width: `${Math.min(100, 100 * l.candidate_token_frac / 0.15)}%` }} />{pct(l.candidate_token_frac)}</td><td>{pct(l.observable)}{l.observable < 0.6 && <small>{ko ? ' 절반 가까이 구름' : ' partly cloud'}</small>}</td><td>{l.external_reports.urls.length ? l.external_reports.urls.map((u, i) => <a key={u} href={u} target="_blank" rel="noreferrer">{new URL(u).hostname.replace('www.', '')}{i < l.external_reports.urls.length - 1 ? ' · ' : ''}</a>) : <span className="muted">—</span>}</td></tr>)}</tbody>
        </table>
        <p className="note">{ko ? '외부 보고는 순위를 낸 뒤에 대조했고 순위 조정에 쓰지 않았습니다. 링크는 제공받은 것이며 이 빌드가 독립 검증하지 않았습니다. 이 시스템은 피해를 확정하지 않습니다 — 사람이 먼저 볼 곳을 좁힙니다.' : rv.posthoc_note + ' The system does not confirm damage — it narrows where people should look first.'}</p>
        {rv.reobserve.length > 0 && <p className="note">{ko ? '판단 보류(구름): ' : 'Held for re-observation (cloud): '}{rv.reobserve.map((r) => `${r.place} (${pct(r.candidate_token_frac)} tokens, ${pct(r.observable)} observable)`).join(' · ')}{ko ? ' — 다음 맑은 광학 또는 레이더로 먼저 재관측할 산사면.' : ' — hillslopes to re-observe first with the next clear optical pass or radar.'}</p>}
        <p className="note">{ko ? `탐색 범위: 강 회랑 ${rv.by_zone.river?.total ?? 41}창(판독 ${rv.by_zone.river?.observable ?? 39}), 주변 산사면 ${rv.by_zone.hillslope?.total ?? 49}창(판독 ${rv.by_zone.hillslope?.observable ?? 6}), 렌데 상류 ${rv.by_zone.lhende?.total ?? 10}창(판독 ${rv.by_zone.lhende?.observable ?? 2}). 결과가 강에 몰린 것은 강만 봤기 때문이 아니라 사건 후 광학영상에서 강 회랑이 훨씬 잘 보였기 때문입니다.` : `Search extent: ${rv.by_zone.river?.total ?? 41} river windows (${rv.by_zone.river?.observable ?? 39} observable), ${rv.by_zone.hillslope?.total ?? 49} hillslope windows (${rv.by_zone.hillslope?.observable ?? 6}), ${rv.by_zone.lhende?.total ?? 10} upstream Lhende windows (${rv.by_zone.lhende?.observable ?? 2}). Results cluster on the river not because only the river was searched, but because the river corridor was far better observed after the event.`}</p>
      </section>
      )}

      <section className="reuse" id="reuse">
        <p className="kicker">{ko ? '재사용' : 'REUSE THIS RECIPE'}</p>
        <h2>{ko ? '다른 홍수·산사태·산림 변화에도 같은 입력 계약과 임베딩 비교법을 적용할 수 있습니다' : 'The same input contract and embedding comparison apply to other floods, landslides and forest change'}</h2>
        <table className="io"><thead><tr><th>{ko ? '넣는 것' : 'you provide'}</th><th>{ko ? '받는 것' : 'you get'}</th></tr></thead><tbody>
          <tr><td>{ko ? 'AOI + 사건 전후 Sentinel-2 장면(12밴드, 10 m)' : 'AOI + before/after Sentinel-2 scenes (12 bands, 10 m)'}</td><td>{ko ? '후보 순위 GeoJSON' : 'ranked candidate GeoJSON'}</td></tr>
          <tr><td>{ko ? 'Earth-embedding model (OlmoEarth v1 Base, frozen — no training)' : 'Earth-embedding model (OlmoEarth v1 Base, frozen — no training)'}</td><td>{ko ? '창별 PRE · POST · AI Δ 이미지' : 'PRE · POST · AI Δ image per window'}</td></tr>
          <tr><td>{ko ? '평시 관측 기간(2주 쌍 2–3개)' : 'ordinary periods (two or three fortnight pairs)'}</td><td>{ko ? '후보별 변화값·관측 가능성·감사 기록(SHA-256)' : 'per-candidate change, observability and an audit record (SHA-256)'}</td></tr>
        </tbody></table>
        <div className="cta"><a href="/story" className="btn">{ko ? '방법과 근거 전체 읽기' : 'METHODS & FULL EVIDENCE'}</a><a className="btn" href="https://github.com/DDanggle/eo_olmo_earth_project" target="_blank" rel="noreferrer">CODE ↗</a></div>
      </section>

      <footer className="landing-foot">
        <p><b>{ko ? '과학적 경계' : 'Scientific boundary'}</b> {ko ? '후보를 찾지만 피해를 확정하지 않습니다.' : 'Finds candidates; does not confirm damage.'}</p>
        <p><b>{ko ? '사용자 가치' : 'User value'}</b> {ko ? '사람이 100곳을 모두 보는 대신 먼저 볼 곳을 알려줍니다.' : 'Instead of looking at 100 places, people know where to look first.'}</p>
        <p><b>{ko ? '재사용 가치' : 'Reuse value'}</b> {ko ? '새로운 재난마다 모델을 다시 학습하지 않습니다.' : 'No retraining for each new disaster.'}</p>
        <small>Model: <a href="https://huggingface.co/allenai/OlmoEarth-v1-Base" target="_blank" rel="noreferrer">OlmoEarth v1 Base</a> (Ai2, open weights, used frozen) · Sentinel-1/2 © ESA Copernicus · PlanetScope © Planet Labs PBC (CC-BY-NC-4.0) · suspected rock–ice avalanche, under investigation · {sc ? new Date(sc.generated_at).toISOString().slice(0, 10) : ''}</small>
      </footer>
    </main>
  );
}
