'use client';
/* eslint-disable @next/next/no-img-element -- static research figure served as-is */
import Link from 'next/link';
import { useEffect, useState } from 'react';

// 연구 페이지(2026-10-19): study 갈래에서 돌린 실험을 한 장에. 숫자는 장부 docs/MEASURED_FINDINGS_full.md M96~M113 에서만 옮겨 적는다.
type Row = { id: string; q: string; q_en: string; set: string; set_en: string; num: string; num_en: string; ans: string; ans_en: string };
const ROWS: Row[] = [
  { id: 'M96', q: '모델이 크면 더 잘 보나', q_en: 'Does a bigger model see more?', set: 'OlmoEarth nano·tiny·base·large, 라수와 56창', set_en: 'OlmoEarth nano/tiny/base/large, 56 Rasuwa windows', num: '발원 폴리곤 p 0.0018~0.0020, 네 크기 동일', num_en: 'source-polygon p 0.0018–0.0020, identical across sizes', ans: '크기 무관. 단 자(4+4창)가 천장', ans_en: 'Size does not matter; the ruler (4+4 windows) is the ceiling' },
  { id: 'M97', q: '단위를 틀리면 얼마나 조용히 틀리나', q_en: 'How silently does a unit mistake fail?', set: '같은 계약, dB↔linear 만 교체', set_en: 'same contract, dB vs linear only', num: '상위6 겹침 0/6, ρ −0.37, 예외 0건', num_en: 'top-6 overlap 0/6, ρ −0.37, zero exceptions', ans: '무작위보다 나쁘게 반대로 정렬, 경고 없음', ans_en: 'Worse than random, reversed order, no warning' },
  { id: 'M98', q: '다른 모델 가족도 같은 곳을 가리키나', q_en: 'Does another model family point to the same place?', set: 'Galileo nano·tiny·base, 같은 56창', set_en: 'Galileo nano/tiny/base, same 56 windows', num: '6/7 arm p<0.002, Galileo tiny 실패', num_en: '6 of 7 arms p<0.002, Galileo tiny fails', ans: '두 가족이 같은 발원 창. 크기 거동은 가족마다 다름', ans_en: 'Both families flag the same source windows; size behaviour differs by family' },
  { id: 'M99', q: '9월 비가 8월 잔해를 움직였나', q_en: 'Did the September rain move the August debris?', set: '발원 56창, 시간만 연장', set_en: '56 source windows, time extended', num: '발원 폴리곤 닿는 깃발 0/6, 상위 4 = 고도 5,020 m', num_en: '0/6 flags on source polygons; top 4 at 5,020 m', ans: '아니오. 신설 눈이 변화를 지배', ans_en: 'No. New snow dominates the change' },
  { id: 'M100', q: '뉴스 지점 5곳 중 위성이 보는 곳은', q_en: 'Which of 5 news sites does the satellite see?', set: '5×5 상자 125창, 궤도 19·158·12', set_en: '125 windows in 5×5 boxes, orbits 19/158/12', num: '수스타 0.19(두 궤도 복제 ρ 0.63), 나머지 ≤0.05', num_en: 'Susta 0.19 (replicated across orbits, ρ 0.63), others ≤0.05', ans: '수스타만 뚜렷. 둑 안 수위·가옥·도로 사면은 못 봄', ans_en: 'Only Susta is clear; in-bank stage, houses and road slopes are invisible' },
  { id: 'M101·102', q: '광학 임베딩·센서 결합이 돕나', q_en: 'Do optical embeddings or fusion help?', set: '삽타리 S2 3v1 + 결합', set_en: 'Saptari S2 3-vs-1 + fusion', num: '광학 vs 레이더 ρ −0.50, 결합이 새로 읽은 창 0', num_en: 'optical vs radar ρ −0.50; fusion adds 0 new windows', ans: '아니오. 하도 확대는 고전 지수가 판별', ans_en: 'No. Channel widening is decided by the classical index' },
  { id: 'M103~105', q: '강을 따라 이으면 어디가 넓어졌나', q_en: 'Along the rivers, where did they widen?', set: '다섯 강 268구간', set_en: '268 stretches on five rivers', num: '상류 나라야니 10.0%·간다크 12.5% vs 바그마티 0.9%·코시 0.8%', num_en: 'upper Narayani 10.0%, Gandak 12.5% vs Bagmati 0.9%, Koshi 0.8%', ans: '나라야니–간다크 한 수계', ans_en: 'One system: Narayani–Gandak' },
  { id: 'M106', q: '외부 운영 제품과 맞나', q_en: 'Does it agree with an operational product?', set: 'Copernicus GFM, 같은 통과', set_en: 'Copernicus GFM, same pass', num: '나라야니 회랑 ρ 0.97, 상위10 GFM 5.35% vs 0.51%', num_en: 'Narayani corridor ρ 0.97; top-10 GFM 5.35% vs 0.51%', ans: '맞음. 어긋난 곳은 삽타리 하나', ans_en: 'Yes; the one disagreement is Saptari' },
  { id: 'M107', q: 'GFM 지표(CSI)로 적으면', q_en: 'In GFM’s own metric (CSI)?', set: '353창, GFM ≥2% 정답', set_en: '353 windows, truth GFM ≥2%', num: '임베딩 CSI 0.54(P 0.92), 새-물 0.62, AND P 0.98', num_en: 'embedding CSI 0.54 (P 0.92), new-water 0.62, AND P 0.98', ans: '오류는 거의 한 종류: 얕은 저지대 범람', ans_en: 'Almost one error type: shallow lowland flooding' },
  { id: 'M108', q: '다른 해에도 같은 문턱이 통하나', q_en: 'Does the same threshold work in another year?', set: '2024 vs 2026, 같은 148창', set_en: '2024 vs 2026, same 148 windows', num: '바그마티 ≥5% 33→0, 상류 나라야니 0→10', num_en: 'Bagmati ≥5%: 33→0; upper Narayani 0→10', ans: '고정 문턱이 해마다 다른 사건을 골라냄', ans_en: 'A fixed threshold picks a different event each year' },
  { id: 'M109', q: '홍수 나흘 뒤엔', q_en: 'Four days after the flood?', set: '궤도 85, 10-03', set_en: 'orbit 85, 3 Oct', num: '상류 나라야니 big 9 중 8 유지', num_en: '8 of 9 upper-Narayani “big” stretches hold', ans: '물이 빠진 게 아니라 강 모양이 바뀜', ans_en: 'Not draining water; the river changed shape' },
  { id: 'M110', q: '10-11 부디 간다키 홍수', q_en: 'The 11 Oct Budhi Gandaki flood', set: '궤도 19 06:03, 37창', set_en: 'orbit 19 at 06:03, 37 windows', num: 'big 1(춤쳇), normal 31', num_en: 'big 1 (Chumchet), normal 31', ans: '위성이 홍수파보다 먼저 지나감', ans_en: 'The satellite passed before the flood wave' },
  { id: 'M111', q: '좌표 사전지식(MIND)으로 창별 문턱', q_en: 'A per-window threshold from a coordinate prior (MIND)?', set: '231창, 강 그룹 홀드아웃', set_en: '231 windows, river-group hold-out', num: '무작위 R² 0.61 → 지역 −1.36(최선 0.25 = 위경도 0.23), CSI 0.60→0.51', num_en: 'random R² 0.61 → regional −1.36 (best 0.25 ≈ lat/lon 0.23); CSI 0.60→0.51', ans: '전역 문턱 유지', ans_en: 'Keep the pooled threshold' },
  { id: 'M112', q: '그게 MIND 탓인가', q_en: 'Is that MIND’s fault?', set: 'SatCLIP L10/L40·GeoCLIP·MIND 같은 폴드', set_en: 'SatCLIP L10/L40, GeoCLIP, MIND, same folds', num: '지역 R² 0.21~0.27 전부, 강 안 R² ≤0.11', num_en: 'regional R² 0.21–0.27 for all; within-river ≤0.11', ans: '과제의 성질(유역 6개)', ans_en: 'A property of the task (six basins)' },
  { id: 'M113', q: '세 번째 모델 가족을 연속 자로', q_en: 'A third model family on a continuous ruler', set: 'TerraMind base·large, 테라이 231창, GFM CSI', set_en: 'TerraMind base/large, 231 Terai windows, GFM CSI', num: 'large CSI 0.61 vs OlmoEarth 0.60, ρ 0.87 · base 0.32 · 바그마티 0~1/24', num_en: 'large CSI 0.61 vs OlmoEarth 0.60, ρ 0.87; base 0.32; Bagmati 0–1 of 24', ans: '가족이 달라도 같은 강, 같은 맹점', ans_en: 'Different family, same rivers, same blind spot' },
];
type M113 = { model: string; rank_corr: Record<string, number>; gfm: { n: number; positive: number; by_tau: Record<string, Record<string, { csi: number; precision: number; recall: number }>> }; contracts: Record<string, { n: number }> };

export default function Research() {
  const [ko, setKo] = useState(true);
  const [m113, setM113] = useState<M113[] | null>(null);
  useEffect(() => { try { const m = document.cookie.match(/(?:^|; )lang=(ko|en)/); if (m) setKo(m[1] === 'ko'); else if (!navigator.language.toLowerCase().startsWith('ko')) setKo(false); } catch { /* noop */ } }, []);  // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { document.body.classList.add('page-scroll'); return () => document.body.classList.remove('page-scroll'); }, []);
  useEffect(() => { fetch('/data/research/m113.json').then((r) => r.ok ? r.json() as Promise<M113[]> : null).then(setM113).catch(() => undefined); }, []);
  const chooseLang = (isKo: boolean) => { setKo(isKo); try { document.cookie = `lang=${isKo ? 'ko' : 'en'};path=/;max-age=31536000`; } catch { /* noop */ } };
  const K = ko;
  return (
    <main className="landing research">
      <nav className="landing-nav">
        <span className="brand">Nepal <b>AI Twin</b><small>{K ? '연구 노트' : 'Research notes'}</small></span>
        <div><button className={!ko ? 'is-active' : ''} onClick={() => chooseLang(false)}>EN</button><button className={ko ? 'is-active' : ''} onClick={() => chooseLang(true)}>한국어</button><Link href="/" className="nav-link">{K ? '홈' : 'HOME'}</Link><a href="/september" className="nav-link">{K ? '9월 지도' : 'SEPTEMBER MAP'}</a></div>
      </nav>
      <section className="hero">
        <p className="kicker">{K ? '연구 · 2026년 9월 9일 ~ 10월 19일' : 'RESEARCH · 9 Sep – 19 Oct 2026'}</p>
        <h1>{K ? <>동결된 지구 임베딩 하나로 세 홍수를 쟀다. <em>무엇을 보고, 무엇을 못 보는가.</em></> : <>Three floods measured with one frozen Earth embedding. <em>What it sees, and what it cannot.</em></>}</h1>
        <p className="sub">{K ? '모델을 학습시키지 않았습니다. Ai2 OlmoEarth v1 Base 를 그대로 두고, Sentinel-1 레이더를 2.56 km 구간씩 홍수 전 세 번·후 한 번 넣어 "평소보다 얼마나 달라졌나"를 숫자로 뽑았습니다. 그 숫자가 믿을 만한지 모델 크기·다른 모델 가족·고전 지수·코페르니쿠스 운영 지도·다른 해·좌표 사전지식으로 차례로 시험한 기록입니다. 현장 정답은 0개이고, 모든 숫자는 측정 장부에서 옮겨 적었습니다.' : 'No model was trained. Ai2 OlmoEarth v1 Base stays frozen; Sentinel-1 radar enters as three pre-flood passes and one post-flood pass per 2.56 km stretch, and the output is a number for "how much more than usual it changed". This page records how that number was tested in turn against model size, a second model family, classical indices, the Copernicus operational flood map, another year and coordinate priors. There are zero field labels; every number is copied from the measurement ledger.'}</p>
      </section>

      <section>
        <p className="kicker">{K ? '한눈에 · 질문과 답' : 'AT A GLANCE · QUESTIONS AND ANSWERS'}</p>
        <div className="rtable"><table>
          <thead><tr><th>#</th><th>{K ? '질문' : 'Question'}</th><th>{K ? '설정' : 'Setting'}</th><th>{K ? '핵심 숫자' : 'Key number'}</th><th>{K ? '답' : 'Answer'}</th></tr></thead>
          <tbody>{ROWS.map((r) => <tr key={r.id}><td className="mono">{r.id}</td><td>{K ? r.q : r.q_en}</td><td className="muted">{K ? r.set : r.set_en}</td><td className="mono small">{K ? r.num : r.num_en}</td><td><b>{K ? r.ans : r.ans_en}</b></td></tr>)}</tbody>
        </table></div>
      </section>

      <section>
        <p className="kicker">{K ? '1 · 모델끼리 — 크기와 가족' : '1 · MODELS — SIZE AND FAMILY'}</p>
        <h2>{K ? '1.4 M 모델도 발원지를 놓치지 않았다. 하지만 자가 그걸 가를 만큼 촘촘하지 않았다.' : 'A 1.4 M model did not miss the source. But the ruler was too coarse to tell models apart.'}</h2>
        <div className="rtable"><table>
          <thead><tr><th>{K ? '가족' : 'Family'}</th><th>{K ? '크기' : 'Size'}</th><th>{K ? '파라미터' : 'Params'}</th><th>ρ vs base</th><th>top6∩</th><th>UNOSAT p</th></tr></thead>
          <tbody>
            {[['OlmoEarth', 'nano', '1.4 M', '0.61', '5', '0.0018'], ['OlmoEarth', 'tiny', '6.2 M', '0.52', '4', '0.0020'], ['OlmoEarth', 'base', '89 M', '1.00', '6', '0.0020'], ['OlmoEarth', 'large', '308 M', '0.71', '5', '0.0019'], ['Galileo', 'nano', '—', '0.26', '4', '0.0019'], ['Galileo', 'tiny', '—', '−0.37', '0', '1.000'], ['Galileo', 'base', '—', '−0.07', '4', '0.0018'], ['Galileo', 'base · linear', '—', '−0.23', '1', '0.120']].map((r, i) => <tr key={i} className={r[5] === '1.000' || r[5] === '0.120' ? 'fail' : ''}>{r.map((c, j) => <td key={j} className={j >= 2 ? 'mono' : ''}>{c}</td>)}</tr>)}
          </tbody>
        </table></div>
        <p className="note">{K ? '라수와 56창, 궤도 19. 발원 폴리곤에 닿는 창은 4개뿐이라 이 자는 사실상 통과/실패 판정이다. 통과한 모델들 사이의 우열은 말할 수 없다(M96·M98). 단위를 틀린 arm 은 두 가족 모두 실패했고, 데이터가 단위를 판정했다(M97).' : '56 Rasuwa windows, orbit 19. Only four windows touch the source polygons, so this ruler is effectively pass/fail; it cannot rank the models that pass (M96, M98). The wrong-unit arm fails in both families, so the data decided the unit (M97).'}</p>
        {m113 && m113.length > 0 && (<>
          <h3>{K ? '세 번째 가족 · TerraMind, 연속 자(GFM CSI)로' : 'Third family · TerraMind, on a continuous ruler (GFM CSI)'}</h3>
          <div className="rtable"><table>
            <thead><tr><th>{K ? '모델' : 'Model'}</th><th>{K ? '창' : 'Windows'}</th><th>CSI τ5%</th><th>CSI τ3%</th><th>CSI τ2%</th><th>{K ? 'ρ vs OlmoEarth' : 'ρ vs OlmoEarth'}</th></tr></thead>
            <tbody>
              <tr><td>OlmoEarth base (40 m)</td><td className="mono">{m113[0].gfm.n}</td>{['0.05', '0.03', '0.02'].map((t) => <td key={t} className="mono">{m113[0].gfm.by_tau[t]?.olmoearth.csi.toFixed(2)}</td>)}<td className="mono">1.00</td></tr>
              {m113.map((m) => (<tr key={m.model}><td>{m.model.replace('terramind_v1_', 'TerraMind v1 ')} (160 m)</td><td className="mono">{m.gfm.n}</td>{['0.05', '0.03', '0.02'].map((t) => <td key={t} className="mono">{m.gfm.by_tau[t]?.terramind_db.csi.toFixed(2)}</td>)}<td className="mono">{m.rank_corr.terramind_db_vs_olmoearth.toFixed(2)}</td></tr>))}
              {m113.map((m) => (<tr key={m.model + 'lin'} className="fail"><td>{m.model.replace('terramind_v1_', 'TerraMind v1 ')} · linear</td><td className="mono">{m.gfm.n}</td>{['0.05', '0.03', '0.02'].map((t) => <td key={t} className="mono">{m.gfm.by_tau[t]?.terramind_linear.csi.toFixed(2)}</td>)}<td className="mono">{m.rank_corr.terramind_linear_vs_olmoearth.toFixed(2)}</td></tr>))}
            </tbody>
          </table></div>
          <p className="note">{K ? '테라이 2026, 궤도 19, 같은 큐브·같은 계약·계약별 플라시보 p99. large 는 OlmoEarth 와 같은 강을 같은 순서로 세우고(ρ 0.87), base 는 상류 나라야니 한 계약에서 평시 문턱이 0.80 으로 폭주해 그 강을 통째로 놓쳤다(원인 미확인). 바그마티 얕은 범람(GFM 양성 24창)은 세 가족 모두 0~1창. TerraMind 는 단일 시점 인코더라 3장 기억은 토큰별 평균이고 토큰이 160 m 라 깃발 비율의 절대값은 같은 척도가 아니다. CSI 와 순위상관만 견준다(M113).' : 'Terai 2026, orbit 19, same cubes, same contract, per-contract placebo p99. The large model ranks the same rivers in the same order as OlmoEarth (ρ 0.87); the base model lost the whole upper Narayani because its placebo threshold there blew up to 0.80 (cause unknown). Shallow Bagmati flooding (24 GFM positives) is missed by all three families, 0–1 windows each. TerraMind is a single-date encoder, so the three-pass memory is a token-wise mean, and its 160 m tokens make flag fractions a different scale; only CSI and rank correlation are compared (M113).'}</p>
        </>)}
      </section>

      <section>
        <p className="kicker">{K ? '2 · 자끼리 — 임베딩 · 고전 새-물 · 코페르니쿠스' : '2 · RULERS — EMBEDDING · CLASSICAL NEW WATER · COPERNICUS'}</p>
        <h2>{K ? '임베딩은 강이 모양을 바꾼 곳을 본다. 물이 얕게 덮인 곳은 못 본다.' : 'The embedding sees where a river changed shape. It does not see shallow water.'}</h2>
        <div className="rtable"><table>
          <thead><tr><th>{K ? '자' : 'Ruler'}</th><th>{K ? '보는 것' : 'Sees'}</th><th>{K ? '못 보는 것' : 'Misses'}</th><th>{K ? '수치' : 'Numbers'}</th></tr></thead>
          <tbody>
            <tr><td>{K ? '임베딩 Δz 깃발(5%)' : 'Embedding Δz flag (5%)'}</td><td>{K ? '하도 확대·사주 침수·퇴적' : 'channel widening, drowned bars, deposition'}</td><td>{K ? '얕게 넓게 퍼진 물, 둑 안 수위' : 'shallow sheets of water, in-bank stage'}</td><td className="mono small">CSI 0.54 · P 0.92 · {K ? '바그마티 2026 0/52' : 'Bagmati 2026 0/52'}</td></tr>
            <tr><td>{K ? '고전 새-물(VV −3 dB·<−16 dB)' : 'Classical new water (VV −3 dB, < −16 dB)'}</td><td>{K ? '물이 새로 덮인 곳' : 'newly water-covered ground'}</td><td>{K ? '사행 하도(평시 귀무 23%)' : 'meandering channels (placebo null up to 23%)'}</td><td className="mono small">CSI 0.62 · P 0.95</td></tr>
            <tr><td>{K ? '둘 다(AND)' : 'Both (AND)'}</td><td>{K ? '틀리지 않는 목록' : 'a list that is not wrong'}</td><td>{K ? '재현율' : 'recall'}</td><td className="mono small">P 0.98 · R 0.55</td></tr>
            <tr><td>Copernicus GFM</td><td>{K ? '20 m 홍수 범위, 8시간 안' : '20 m flood extent within 8 h'}</td><td>{K ? '역시 모델 산출물' : 'also a model output'}</td><td className="mono small">{K ? '나라야니 회랑 ρ 0.97' : 'Narayani corridor ρ 0.97'}</td></tr>
            <tr><td>{K ? '광학 임베딩(S2)' : 'Optical embedding (S2)'}</td><td>{K ? '평지 계절 변화(원인 미확인)' : 'seasonal change on flat land (cause unknown)'}</td><td>{K ? '이미 물이던 하도의 확대' : 'widening of an already-wet channel'}</td><td className="mono small">{K ? '삽타리 vs SCL 물 ρ −0.32' : 'Saptari vs SCL water ρ −0.32'}</td></tr>
          </tbody>
        </table></div>
        <p className="note">{K ? '큰 강 회랑에서는 세 자가 같은 그림을 그린다(CSI 0.77~0.91). 사행 하도와 얕은 범람에서 갈린다. 2024 바그마티(큰 범람)는 봤고 2026 바그마티(얕음)는 못 봤다 — 경계는 "2.56 km 창의 임베딩을 평시 상위 1% 밖으로 밀 만큼 큰가"다(M107·M108).' : 'On large river corridors the three rulers draw the same picture (CSI 0.77–0.91); they part on meandering channels and shallow flooding. The 2024 Bagmati (large) was seen, the 2026 Bagmati (shallow) was not: the boundary is whether a flood pushes a 2.56 km window past the ordinary top 1% (M107, M108).'}</p>
      </section>

      <section>
        <p className="kicker">{K ? '3 · 문턱끼리 — 전역 플라시보 vs 좌표 사전지식' : '3 · THRESHOLDS — POOLED PLACEBO VS COORDINATE PRIORS'}</p>
        <h2>{K ? '네 가지 좌표 인코더가 같은 천장에 멈췄다. 그 천장은 위경도 2차식이다.' : 'Four coordinate encoders stop at the same ceiling. The ceiling is a quadratic in latitude and longitude.'}</h2>
        <div className="rtable"><table>
          <thead><tr><th>{K ? '문턱' : 'Threshold'}</th><th>{K ? '지역 홀드아웃 R²' : 'Regional hold-out R²'}</th><th>{K ? '강 안 R²' : 'Within-river R²'}</th><th>GFM CSI</th></tr></thead>
          <tbody>
            <tr><td>{K ? '전역 플라시보 p99(현행)' : 'Pooled placebo p99 (current)'}</td><td className="mono">−0.23</td><td className="mono">—</td><td className="mono"><b>0.60</b></td></tr>
            <tr><td>{K ? '위경도 2차식' : 'Lat/lon quadratic'}</td><td className="mono">0.23</td><td className="mono">—</td><td className="mono">—</td></tr>
            <tr><td>SatCLIP L10 / L40</td><td className="mono">0.26 / 0.27</td><td className="mono">0.00 / 0.11</td><td className="mono">—</td></tr>
            <tr><td>GeoCLIP</td><td className="mono">0.22</td><td className="mono">0.03</td><td className="mono">—</td></tr>
            <tr><td>MIND 64 / 256 / 3072-d</td><td className="mono">0.25 / 0.21 / 0.22</td><td className="mono">−0.03 / 0.03 / 0.04</td><td className="mono">0.51</td></tr>
          </tbody>
        </table></div>
        <img src="/data/september/M111_mind_prior_figure.svg" alt={K ? 'M111 그림: 강 그룹 홀드아웃 R² 와 예측 대 실측' : 'M111 figure: regional R² and prediction vs measurement'} className="rfig" />
        <p className="note">{K ? '231창, 같은 플라시보 날짜, 강 그룹 6개 leave-one-out. 라벨이 가까우면 좌표만으로 평소 흔들림의 60%를 설명하지만 강을 건너면 강별 평균 높이만 옮겨진다. 창별 문턱은 GFM 일치를 낮춘다. 그래서 전역 문턱을 유지한다(M111·M112). 격자 선택을 시험 지표로 했으므로 최선 행은 상한이다.' : '231 windows, same placebo dates, six river groups held out one at a time. With labels nearby, coordinates alone explain 60% of ordinary wobble; across rivers only a per-river offset transfers. Per-window thresholds lower agreement with GFM, so the pooled threshold stays (M111, M112). Grid selection used the test metric, so the best rows are upper bounds.'}</p>
      </section>

      <section>
        <p className="kicker">{K ? '가로지르는 교훈' : 'LESSONS THAT CUT ACROSS'}</p>
        <ul className="plain">
          <li><b>01</b>{K ? '조용한 실패가 가장 비싸다. 단위 뒤집힘, 토큰 만료 19.5시간 정지, 장면 구름 헤더, 지명 좌표 오차. 전부 "돌아가는 것처럼 보이는데 틀림"이었고, 전부 외부 자로만 잡혔다.' : 'Silent failures cost the most: a flipped unit, a 19.5-hour stall on an expired token, a scene cloud header, misplaced place coordinates. Each looked like it was working, and each was caught only by an external ruler.'}</li>
          <li><b>02</b>{K ? '야드스틱의 해상도가 결론의 해상도다. "크기 무관"은 4+4 창의 천장이고 "좌표 무용"은 유역 6개의 천장이다. 모델이 아니라 라벨 수를 늘려야 답이 바뀌는 질문들이다.' : 'The ruler’s resolution is the conclusion’s resolution. “Size does not matter” is a 4+4-window ceiling; “coordinates do not help” is a six-basin ceiling. These questions change with more labels, not with another model.'}</li>
          <li><b>03</b>{K ? '임베딩은 형상을 보고 물 자체는 못 본다. 경계는 변화가 2.56 km 창의 임베딩을 평시 상위 1% 밖으로 밀 만큼 큰가다.' : 'The embedding sees shape, not water. The boundary is whether a change pushes a 2.56 km window past the ordinary top 1%.'}</li>
          <li><b>04</b>{K ? '타이밍은 모델 밖의 문제다. 12일 궤도는 10-11 홍수파보다 27분 먼저 지나갔다. 일일 광학이 메울 자리이고 경쟁이 아니라 보완이다.' : 'Timing is outside the model. The 12-day orbit crossed 27 minutes before the flood wave on 11 October; daily optical imagery fills that gap as a complement, not a rival.'}</li>
          <li><b>05</b>{K ? '고정 문턱이 해를 가른다. 같은 창에서 2024엔 바그마티, 2026엔 나라야니.' : 'A fixed threshold separates years: on the same windows, Bagmati in 2024 and Narayani in 2026.'}</li>
        </ul>
      </section>

      <section>
        <p className="kicker">{K ? '자료와 재현' : 'DATA AND REPRODUCTION'}</p>
        <p className="sub small">{K ? '자료: ESA Copernicus Sentinel-1 RTC·Sentinel-2 L2A(Microsoft Planetary Computer), Copernicus GFM, UNOSAT 발원 폴리곤, OpenStreetMap 하천선. 모델: Ai2 OlmoEarth v1 Base(동결), Galileo(nasaharvest), TerraMind v1(IBM·ESA), MIND·SatCLIP·GeoCLIP 공개 가중치. 측정 장부 M96~M113. 영문 노트: MIND 좌표 사전지식 시험(M111·M112).' : 'Data: ESA Copernicus Sentinel-1 RTC and Sentinel-2 L2A (Microsoft Planetary Computer), Copernicus GFM, UNOSAT source polygons, OpenStreetMap river lines. Models: Ai2 OlmoEarth v1 Base (frozen), Galileo (nasaharvest), TerraMind v1 (IBM/ESA), public MIND, SatCLIP and GeoCLIP weights. Measurement ledger M96–M113. English note: the MIND coordinate-prior test (M111, M112).'}</p>
        <div className="cta"><a className="btn" href="/data/research/M111_mind_prior_note_en.md" download>{K ? 'M111·M112 영문 노트 (MD)' : 'M111·M112 NOTE (MD)'}</a><a className="btn" href="/data/research/STUDY_SUMMARY_M96-M113.md" download>{K ? '연구 요약 (MD)' : 'STUDY SUMMARY (MD)'}</a><a className="btn" href="/september">{K ? '9월 지도로' : 'TO THE SEPTEMBER MAP'}</a></div>
      </section>
    </main>
  );
}
