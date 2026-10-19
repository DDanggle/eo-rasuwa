'use client';
/* eslint-disable @next/next/no-img-element -- sealed research rasters are intentionally served without image transformation */
import { useEffect, useState } from 'react';

// 첫 화면(2026-08-30 개편): 메시지 하나 — 100개 창 → 47개 판독 가능 → 6곳 우선 검토. 증거 전체는 /map 과 STORY 로.
type Lead = { id: string; rank: number; place: string; kind: string; candidate_token_frac: number; candidate_token_frac_single_pair: number | null; observable: number; center_lonlat: [number, number]; images: { pre: string; post: string; delta: string }; external_reports: { urls: string[]; verified_by_this_build: boolean } };
type Review = { funnel: { scanned: number; observable: number; leads: number; confirmed_damage_labels: number }; by_zone: Record<string, { total: number; observable: number }>; threshold: number | null; leads: Lead[]; reobserve: { id: string; place: string; candidate_token_frac: number; observable: number; images: { pre: string; post: string; delta: string } }[]; download: string; all_observable_download?: string; posthoc_note: string };
type Scenario = { generated_at: string; review?: Review | null; placebo_extended?: { threshold_pooled3: number } | null };
// 챕터 2(24~29 Sep 몬순): 별도 파일 september.json. 숫자는 장부 M99~M102 에서만.
type September = { event: { reported: string; reported_ko: string }; source_corridor: { windows: number; reading: string; reading_ko: string }; flood_sites: Record<string, { name: string; name_ko: string; news: string; news_ko: string; windows: number; verdict: string; reading: string; reading_ko: string; top: { id: string; center_lonlat: [number, number] }[] }>; fused_top: { id: string; site: string; fused_frac: number }[]; fusion: { headline: string; headline_ko: string; figure: string }; monsoon_status: { text: string; text_ko: string }; download: string };

export default function Landing() {
  const [sc, setSc] = useState<Scenario | null>(null);
  const [sept, setSept] = useState<September | null>(null);
  type SimpleSummary = { reaches: number; y2026: Record<string, number>; y2024: Record<string, number>; rivers26: { name: string; name_ko: string; big: number; obs: number }[]; rivers24: { name: string; name_ko: string; big: number; obs: number }[]; oct?: { reaches: number; big: number; obs: number; headline?: string; headline_ko?: string }; headline: string; headline_ko: string; headline24: string; headline24_ko: string };
  const [simple, setSimple] = useState<SimpleSummary | null>(null);
  const [ko, setKo] = useState(true);
  // 언어: middleware가 IP 국가로 심은 lang 쿠키 → 없으면 브라우저 언어
  useEffect(() => {
    try {
      const m = document.cookie.match(/(?:^|; )lang=(ko|en)/);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 하이드레이션 후 1회 언어 동기화
      if (m) setKo(m[1] === 'ko');
       
      else if (!navigator.language.toLowerCase().startsWith('ko')) setKo(false);
    } catch { /* noop */ }
  }, []);
  const chooseLang = (isKo: boolean) => { setKo(isKo); try { document.cookie = `lang=${isKo ? 'ko' : 'en'};path=/;max-age=31536000`; } catch { /* noop */ } };
  const [swipe, setSwipe] = useState(50);
  useEffect(() => { document.body.classList.add('page-scroll'); return () => document.body.classList.remove('page-scroll'); }, []);
  useEffect(() => { fetch('/data/scenario.json').then((r) => r.json() as Promise<Scenario>).then(setSc).catch(() => undefined); fetch('/data/september.json').then((r) => r.ok ? r.json() as Promise<September> : null).then(setSept).catch(() => undefined); fetch('/data/september-simple-summary.json').then((r) => r.ok ? r.json() : null).then(setSimple).catch(() => undefined); }, []);
  const rv = sc?.review ?? null; const lead = rv?.leads[0];
  const pct = (x: number | null | undefined) => x == null ? '—' : `${(100 * x).toFixed(0)}%`;
  return (
    <main className="landing">
      <nav className="landing-nav">
        <span className="brand">Nepal <b>AI Twin</b><small>{ko ? '위성으로 본 네팔의 강과 홍수' : 'Nepal\u2019s rivers and floods, seen from orbit'}</small></span>
        <div><button className={!ko ? 'is-active' : ''} onClick={() => chooseLang(false)}>EN</button><button className={ko ? 'is-active' : ''} onClick={() => chooseLang(true)}>한국어</button><a href="/september" className="nav-link">{ko ? '9월 홍수 지도' : 'SEPTEMBER MAP'}</a><a href="/map" className="nav-link">{ko ? '8월 홍수 지도' : 'AUGUST MAP'}</a><a href="/decision-support" className="nav-link">{ko ? '의사결정 데모' : 'DECISION DEMO'}</a><a href="/research" className="nav-link">{ko ? '연구' : 'RESEARCH'}</a><a href="/story" className="nav-link quiet">STORY</a></div>
      </nav>

      {simple?.oct && <a href="/september?ev=1011" className="newsline"><b>{ko ? '새 홍수 · 10월 11일' : 'NEW FLOOD · 11 OCT'}</b><span>{ko ? `고르카 부디 간다키강, 산사태 댐 붕괴. 위성은 홍수보다 먼저 지나가 춤쳇의 산사태만 봤습니다 (${simple.oct.reaches}구간 중 크게 변한 곳 ${simple.oct.big}). 다음 통과 10월 23일.` : `Budhi Gandaki, Gorkha: a landslide dam burst. The satellite passed before the flood and saw only the Chumchet landslide (${simple.oct.big} of ${simple.oct.reaches} stretches changed a lot). Next pass 23 Oct.`}</span><i>→</i></a>}
      <div className="mains">
      <section className="lead-story">
        <p className="kicker">{ko ? '최근 · 2026년 9월 24~29일 몬순 막바지 호우' : 'LATEST · the late-monsoon rains of 24–29 Sep 2026'}</p>
        <h1>{simple ? (ko ? simple.headline_ko : simple.headline) : (ko ? '나라야니강이 인도 국경 너머까지 넓어졌습니다' : 'The Narayani widened past the Indian border')}</h1>
        <p className="sub">{ko ? '비가 그친 뒤 위성 레이더로 본 강입니다. 데브갓 아래부터 수스타를 지나 비하르까지 강이 평소 몬순보다 크게 변했고, 바그마티·코시·라프티·티나우는 대부분 평소 수준이었습니다. 같은 방법으로 본 2024년 9월에는 반대로 바그마티강이 넓어졌습니다.' : 'The rivers as satellite radar saw them once the rain stopped. From below Devghat, past Susta and into Bihar, the river changed far more than in an ordinary monsoon; the Bagmati, Koshi, Rapti and Tinau stayed mostly as usual. Measured the same way, September 2024 was the reverse: the Bagmati widened.'}</p>
        {simple && <div className="river-bars" role="img" aria-label="river stretches that changed a lot, 2026 vs 2024">
          <div className="rb-head"><span /><b>{ko ? '2026년 9월' : 'SEP 2026'}</b><b className="y24">{ko ? '2024년 9월' : 'SEP 2024'}</b></div>
          {simple.rivers26.filter((r) => r.obs > 0).map((r) => { const r24 = simple.rivers24.find((x) => x.name === r.name); const w = (n: number, o: number) => `${Math.round(100 * n / Math.max(o, 1))}%`; return (
            <div key={r.name} className="rb-row"><span>{ko ? r.name_ko : r.name}</span>
              <div className="rb-bar"><i style={{ width: w(r.big, r.obs) }} /><em>{r.big}<small>/{r.obs}</small></em></div>
              <div className="rb-bar y24">{r24 && r24.obs > 0 ? <><i style={{ width: w(r24.big, r24.obs) }} /><em>{r24.big}<small>/{r24.obs}</small></em></> : <em className="na">{ko ? '자료 없음' : 'no pass'}</em>}</div>
            </div>); })}
          <p className="rb-note">{ko ? '강을 2.56 km 구간으로 잘라, 평소 몬순 범위를 크게 넘은 구간 수 / 위성이 읽은 구간 수. 피해가 아니라 평소보다 많이 변한 곳입니다.' : 'River cut into 2.56 km stretches: stretches far beyond their ordinary monsoon range / stretches the satellite could read. Change beyond usual, not damage.'}</p>
        </div>}
        {sept && <p className="note">{ko ? sept.monsoon_status.text_ko : sept.monsoon_status.text}</p>}
        <div className="cta"><a href="/september" className="btn primary">{ko ? '지도에서 강별로 보기' : 'SEE EACH RIVER ON THE MAP'}</a>{sept && <a href={sept.download} className="btn" download>{ko ? '자료 내려받기' : 'DOWNLOAD THE DATA'}</a>}</div>
      </section>

      <section className="hero ch1-story">
        <p className="kicker">{ko ? '앞선 장 · 2026년 8월 26일 라수와 돌발 홍수' : 'EARLIER · the Rasuwa flash flood of 26 Aug 2026'}</p>
        <h1>{ko ? <>위성이 찍은 <em>100곳</em> 가운데<br />먼저 확인할 곳 <em>6곳.</em></> : <><em>100 places</em> imaged from orbit.<br /><em>6</em> to check first.</>}</h1>
        <p className="sub">{ko ? <>빙하가 무너져 강을 막았다 터진 날, 사건 전후의 위성 사진을 범용 지구 임베딩 모델(<a href="https://huggingface.co/allenai/OlmoEarth-v1-Base" target="_blank" rel="noreferrer">Ai2 OlmoEarth v1 Base</a>, 학습 없이 사용)로 비교해 평소보다 크게 달라진 장소만 남겼습니다. 피해를 확정하는 것이 아니라, 사람이 먼저 볼 곳을 좁힙니다.</> : <>The day a glacier collapse dammed and then burst the river, before/after satellite scenes were compared with a general Earth-embedding model (<a href="https://huggingface.co/allenai/OlmoEarth-v1-Base" target="_blank" rel="noreferrer">Ai2 OlmoEarth v1 Base</a>, used without training), keeping only the places that changed more than usual. It does not confirm damage; it narrows where people should look first.</>}</p>
        <div className="funnel" role="img" aria-label="100 scanned, 47 observable, 6 review leads, 0 confirmed damage labels">
          <div><b>{rv?.funnel.scanned ?? 100}</b><span>{ko ? '위성이 찍은 곳' : 'scanned'}</span></div><i>→</i>
          <div><b>{rv?.funnel.observable ?? 47}</b><span>{ko ? '구름 없이 읽힌 곳' : 'observable'}</span></div><i>→</i>
          <div className="lead"><b>{rv?.funnel.leads ?? 6}</b><span>{ko ? '먼저 확인할 곳' : 'review leads'}</span></div><i>·</i>
          <div className="zero"><b>0</b><span>{ko ? '확정한 피해' : 'confirmed damage'}</span></div>
        </div>
        <div className="cta">
          <a href="/map" className="btn primary">{ko ? '6곳 지도에서 보기' : 'SEE THE 6 PLACES ON THE MAP'}</a>
          <a href={rv?.all_observable_download ?? '/data/candidates.geojson'} className="btn" download>{ko ? '자료 내려받기' : 'DOWNLOAD THE DATA'}</a>
        </div>
      </section>
      </div>

      <section className="how">
        <p className="kicker">GEO EVIDENCE · {ko ? '관측에서 다음 판단까지' : 'FROM OBSERVATION TO A REVIEW DECISION'}</p>
        <h2>{ko ? '근거를 비교하고, 확인할 곳을 선택하세요.' : 'Compare the evidence. Choose where to look next.'}</h2>
        <p className="note">{ko ? '실제 관측된 47곳을 비교하고, 검토 목록과 출처가 포함된 근거 자료를 내려받으세요. ESCWA 지원을 위한 독립 포트폴리오 데모이며 공식 기관 서비스가 아닙니다.' : 'Compare 47 observable windows and export your review list with its evidence and sources. An independent portfolio demo developed for an ESCWA application, with no institutional affiliation.'}</p>
        <div className="cta"><a href="/decision-support" className="btn primary">{ko ? '의사결정 지원 데모 열기' : 'OPEN THE DECISION SUPPORT DEMO'}</a></div>
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
          <figure><img src={lead?.images.delta ?? '/data/candidates/v003_delta.png'} alt="embedding change" style={{ backgroundImage: `url(${lead?.images.post ?? '/data/candidates/v003_post.png'})`, backgroundSize: 'cover' }} /><figcaption><b>{ko ? '임베딩 변화' : 'EMBEDDING CHANGE'}</b>{ko ? ' — 평소 범위를 넘은 40 m 토큰(주황). 왼쪽 손잡이를 끌어 전후를 비교하세요.' : ' — 40 m tokens beyond their ordinary range (orange). Drag the handle on the left to compare.'}</figcaption></figure>
        </div>
        <p className="how-text">{ko ? '같은 장소를 사건 전과 후에 찍은 위성 사진을 AI 임베딩으로 비교해 얼마나 달라졌는지 잽니다. 그다음, 사건이 없던 평소 몇 주 동안 그 장소가 저절로 얼마나 달라지는지도 같은 방법으로 잽니다. 이 페이지의 숫자는 “평소 변화 범위를 넘은 40 m 격자의 비율”입니다. 피해 면적이 아니라, 평소보다 많이 변한 정도입니다.' : 'The same place is photographed from orbit before and after the event, and an AI embedding measures how much it changed. Then the same method measures how much that place drifts on its own in ordinary weeks with no event. Every number on this page is the share of 40 m cells that moved beyond that ordinary range. It is a measure of unusual change, not a damaged area.'}</p>
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
            <p>{ko ? `이 2.56 km 창에서는 40 m 격자의 ${pct(lead.candidate_token_frac)}가 평소 변화 기준을 넘어 크게 달라졌습니다. 27일 영상은 ${pct(lead.observable)}만 구름 없이 관측되어, 보이는 부분을 최대한 살려 판독한 결과입니다. 빙하가 무너져 산사태가 시작된 지점에서 강을 따라 흘러내린 구간에 있어, 실제 피해가 의심되는 곳입니다.` : `In ${pct(lead.candidate_token_frac)} of this 2.56 km window's 40 m cells the before/after embedding distance Δz exceeded the ordinary 99th-percentile threshold, and ${pct(lead.observable)} of the 27 Aug scene was cloud-free. About six kilometres down the river corridor from the border impact, this broad valley floor is the first place for a person to check—not a confirmed deposit.`}</p>
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
        <div className="cta"><a href="/story" className="btn">{ko ? '방법과 근거 전체 읽기' : 'METHODS & FULL EVIDENCE'}</a><a className="btn" href="https://github.com/DDanggle/eo-rasuwa" target="_blank" rel="noreferrer">CODE ↗</a></div>
      </section>

      <aside className="donate-inline" aria-label={ko ? '긴급 구호 후원' : 'Emergency relief donations'}>
        <b>{ko ? '후원을 부탁드립니다' : 'Please consider donating'}</b>
        <p>{ko ? '이 페이지는 기부를 받지 않지만, 네팔의 피해에 힘을 보태주시면 훨씬 더 빠른 수색과 회복에 도움이 됩니다. 아래는 네팔 현장에 직접 나가 있는 공인 단체의 후원 링크입니다.' : 'This page takes no donations. If you can help, these accredited organisations are on the ground in Nepal right now — your support speeds the search and the recovery.'}</p>
        <div>
          <a href="https://donation.nrcs.org/" target="_blank" rel="noreferrer">{ko ? '네팔 적십자사' : 'Nepal Red Cross'}</a>
          <a href="https://www.ifrc.org/emergency/nepal-flash-floods-2026" target="_blank" rel="noreferrer">IFRC</a>
          <a href="https://www.unicef.org/nepal/flooding-nepal-2026-0" target="_blank" rel="noreferrer">UNICEF</a>
          <a href="https://www.icrc.org/en/donate" target="_blank" rel="noreferrer">ICRC</a>
        </div>
        <small className="donate-add">{ko ? <>네팔 현장에서 활동 중인 공인 구호 기관이라면 <a href="mailto:iameastroot@gmail.com">메일</a>을 주세요 — 확인 후 이 목록에 추가합니다.</> : <>Accredited relief organisations working in Nepal: <a href="mailto:iameastroot@gmail.com">email us</a> and we will verify and add your link.</>}</small>
      </aside>

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
            <p>{ko ? `2026년 8월 26일, 네팔 라수와 군에서 얼음과 암반이 무너져 강을 일시적으로 막았다가 터진 돌발 산사태·홍수입니다. 네팔 정부 NDRRMA와 USGS는 이를 빙하호 붕괴(GLOF)가 아니라 ice–rock avalanche로 판정했습니다. 이 페이지는 원인을 판정하지 않고, 관측된 변화만 보여줍니다. LAST UPDATE ${sc ? new Date(sc.generated_at).toISOString().slice(0, 10) : ''}. 코드와 실험 기록(M66–M98)은 GitHub에 있습니다.` : `Flash flood of 26 August 2026 in Rasuwa district, Nepal: an ice–rock avalanche that dammed the river and released. Nepal's NDRRMA and the USGS record it as an ice–rock avalanche, not a glacial lake outburst. This page does not adjudicate the cause; it shows observed change. LAST UPDATE ${sc ? new Date(sc.generated_at).toISOString().slice(0, 10) : ''}. Code and the measurement ledger (M66–M98) are on GitHub.`} <a href="https://github.com/DDanggle/eo-rasuwa" target="_blank" rel="noreferrer">github ↗</a></p>
          </div>
          <div>
            <b>{ko ? '돕고 싶다면' : 'How to help'}</b>
            <p>{ko ? <>이 페이지는 개인 분석 프로젝트이며 기부를 받지 않습니다. 긴급 구호와 관련한 공식 페이지가 열려 있습니다 — 꼭 확인해보세요: <a href="https://donation.nrcs.org/" target="_blank" rel="noreferrer">네팔 적십자사</a>·<a href="https://www.ifrc.org/emergency/nepal-flash-floods-2026" target="_blank" rel="noreferrer">IFRC ↗</a> / <a href="https://www.unicef.org/nepal/flooding-nepal-2026-0" target="_blank" rel="noreferrer">UNICEF ↗</a>·<a href="https://www.icrc.org/en/donate" target="_blank" rel="noreferrer">ICRC</a></> : <>This is a personal analysis project and accepts no donations. Official emergency-relief pages are open — please have a look: <a href="https://donation.nrcs.org/" target="_blank" rel="noreferrer">Nepal Red Cross</a>·<a href="https://www.ifrc.org/emergency/nepal-flash-floods-2026" target="_blank" rel="noreferrer">IFRC ↗</a> / <a href="https://www.unicef.org/nepal/flooding-nepal-2026-0" target="_blank" rel="noreferrer">UNICEF ↗</a>·<a href="https://www.icrc.org/en/donate" target="_blank" rel="noreferrer">ICRC</a></>}</p>
          </div>
        </div>
        <p className="foot-credit">{ko
          ? <>만든 사람 <a href="https://careerly.co.kr/profile/719170" target="_blank" rel="noreferrer">Donggeun Yi</a> · 자문 <a href="https://profiles.rice.edu/student/jong-gil-park" target="_blank" rel="noreferrer">Jong Gil Park</a></>
          : <>Built by <a href="https://careerly.co.kr/profile/719170" target="_blank" rel="noreferrer">Donggeun Yi</a> · special thanks to <a href="https://profiles.rice.edu/student/jong-gil-park" target="_blank" rel="noreferrer">Jong Gil Park</a> for his advice</>}</p>
        <p className="foot-contact">{ko ? '문의' : 'Contact'}: <a href="mailto:iameastroot@gmail.com">{ko ? '이메일' : 'email'}</a></p>
        <p className="foot-disclaimer">{ko
          ? '독립 개인 연구 데모입니다. Ai2·ESA/Copernicus·Planet Labs, 그리고 위에 링크된 구호 기관과 제휴하거나 승인·보증을 받은 프로젝트가 아닙니다.'
          : 'An independent personal research demo. Not affiliated with, endorsed by, or acting for Ai2, ESA/Copernicus, Planet Labs, or any relief organisation linked above.'}</p>
      </footer>
    </main>
  );
}
