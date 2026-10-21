'use client';
/* eslint-disable @next/next/no-img-element -- static research figure served as-is */
import Link from 'next/link';
import { useEffect, useState } from 'react';

// 연구 페이지(2026-10-21 다시 씀): 보고서 순서로. 요약 → 한 일 → 알아낸 것 → 못 보는 것 → 흐름 → 실험 목록 → 자료.
// 숫자는 장부 docs/MEASURED_FINDINGS_full.md 에서만 옮겨 적는다. 용어는 맨 앞에서 네 개만 푼다.

type Row = { id: string; q: string; q_en: string; a: string; a_en: string; n: string; n_en: string };
const ROWS: Row[] = [
  { id: 'M96', q: '모델이 크면 더 잘 보나?', q_en: 'Does a bigger model see more?', a: '아니오. 1.4 M 모델도 발원지를 찾았다.', a_en: 'No. Even the 1.4 M model found the source.', n: 'OlmoEarth 네 크기 모두 p ≈ 0.002', n_en: 'all four OlmoEarth sizes p ≈ 0.002' },
  { id: 'M97', q: '단위를 틀리면 어떻게 되나?', q_en: 'What happens with the wrong unit?', a: '경고 없이 순서가 뒤집힌다.', a_en: 'The ranking reverses with no warning.', n: '상위 6개 겹침 0, ρ −0.37', n_en: 'top-6 overlap 0, ρ −0.37' },
  { id: 'M98', q: '다른 모델(Galileo)도 같은 곳을 가리키나?', q_en: 'Does another model (Galileo) point to the same place?', a: '예. 크기별 거동만 다르다.', a_en: 'Yes; only size behaviour differs.', n: '7개 중 6개 p < 0.002', n_en: '6 of 7 arms p < 0.002' },
  { id: 'M99', q: '9월 비가 8월 산사태 잔해를 움직였나?', q_en: 'Did September rain move the August debris?', a: '아니오. 변한 건 새 눈이었다.', a_en: 'No. The change was fresh snow.', n: '깃발 상위 4곳 모두 고도 5,020 m', n_en: 'top 4 flags all at 5,020 m' },
  { id: 'M100', q: '뉴스에 나온 5곳 중 위성이 보는 곳은?', q_en: 'Of 5 places in the news, which does the satellite see?', a: '수스타 한 곳. 둑 안 수위·가옥·도로는 못 본다.', a_en: 'Susta only. In-bank stage, houses, roads are invisible.', n: '수스타 0.19, 나머지 ≤ 0.05', n_en: 'Susta 0.19, others ≤ 0.05' },
  { id: 'M101·102', q: '광학 영상을 섞으면 나아지나?', q_en: 'Does adding optical imagery help?', a: '아니오. 새로 읽어낸 창 0개.', a_en: 'No. Zero new windows found.', n: '광학 vs 레이더 ρ −0.50', n_en: 'optical vs radar ρ −0.50' },
  { id: 'M103~105', q: '다섯 강 중 어디가 넓어졌나?', q_en: 'Which of five rivers widened?', a: '나라야니와 간다크. 한 수계다.', a_en: 'Narayani and Gandak, one river system.', n: '10.0%·12.5% vs 바그마티 0.9%·코시 0.8%', n_en: '10.0%, 12.5% vs Bagmati 0.9%, Koshi 0.8%' },
  { id: 'M106', q: '코페르니쿠스 운영 홍수지도와 맞나?', q_en: 'Does it agree with the Copernicus flood map?', a: '예. 어긋난 곳은 삽타리 하나.', a_en: 'Yes; the one disagreement is Saptari.', n: '나라야니 회랑 ρ 0.97', n_en: 'Narayani corridor ρ 0.97' },
  { id: 'M107', q: '그 지도의 점수(CSI)로 적으면?', q_en: 'In that map’s own score (CSI)?', a: '0.54. 틀린 건 거의 얕은 범람 하나.', a_en: '0.54; nearly all misses are shallow flooding.', n: '임베딩 0.54 · 고전 새-물 0.62', n_en: 'embedding 0.54, classical new-water 0.62' },
  { id: 'M108', q: '같은 기준이 다른 해에도 통하나?', q_en: 'Does the same threshold work in another year?', a: '예. 2024엔 바그마티, 2026엔 나라야니를 골라냈다.', a_en: 'Yes: Bagmati in 2024, Narayani in 2026.', n: '바그마티 33 → 0, 나라야니 0 → 10', n_en: 'Bagmati 33 → 0, Narayani 0 → 10' },
  { id: 'M109', q: '홍수 나흘 뒤엔?', q_en: 'Four days after the flood?', a: '물이 빠진 게 아니라 강 모양이 바뀌었다.', a_en: 'The river changed shape; it did not just drain.', n: '큰 변화 9곳 중 8곳 유지', n_en: '8 of 9 big stretches hold' },
  { id: 'M110', q: '10월 11일 부디 간다키 홍수는?', q_en: 'The 11 October Budhi Gandaki flood?', a: '위성이 홍수보다 27분 먼저 지나갔다.', a_en: 'The satellite passed 27 minutes before the flood.', n: '큰 변화 1창(춤쳇)', n_en: 'big 1 (Chumchet)' },
  { id: 'M111', q: '위치마다 다른 기준선을 쓰면 나아지나?', q_en: 'Is a per-location threshold better?', a: '아니오. 다른 강으로 옮기면 무너진다.', a_en: 'No. It collapses on an unseen river.', n: 'CSI 0.60 → 0.51', n_en: 'CSI 0.60 → 0.51' },
  { id: 'M112', q: '그게 MIND 한 모델 탓인가?', q_en: 'Is that one model’s fault?', a: '아니오. 네 좌표 모델 모두 같은 천장.', a_en: 'No. Four coordinate models hit the same ceiling.', n: '지역 R² 0.21~0.27, 위경도식 0.23', n_en: 'regional R² 0.21–0.27, lat/lon 0.23' },
  { id: 'M113', q: '세 번째 모델(TerraMind)도 같은 그림인가?', q_en: 'Does a third model (TerraMind) draw the same picture?', a: '예(large). 맹점도 같다.', a_en: 'Yes (large), with the same blind spot.', n: 'CSI 0.61 vs 0.60, ρ 0.87', n_en: 'CSI 0.61 vs 0.60, ρ 0.87' },
];

// M113 고정값(artifacts/terramind_scan_m113/report_terramind_v1_{base,large}.json). 창 229, GFM 양성 88.
const TM: [string, string, string, string, string, boolean][] = [
  ['OlmoEarth base (40 m)', '0.60', '0.62', '0.64', '1.00', false],
  ['TerraMind v1 large (160 m)', '0.61', '0.62', '0.62', '0.87', false],
  ['TerraMind v1 base (160 m)', '0.32', '0.39', '0.43', '0.75', false],
  ['TerraMind v1 large · 단위 틀림', '0.05', '0.08', '0.15', '0.11', true],
  ['TerraMind v1 base · 단위 틀림', '0.05', '0.11', '0.15', '0.22', true],
];

export default function Research() {
  const [ko, setKo] = useState(true);
  useEffect(() => { try { const m = document.cookie.match(/(?:^|; )lang=(ko|en)/); if (m) setKo(m[1] === 'ko'); else if (!navigator.language.toLowerCase().startsWith('ko')) setKo(false); } catch { /* noop */ } }, []);  // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { document.body.classList.add('page-scroll'); return () => document.body.classList.remove('page-scroll'); }, []);
  const chooseLang = (isKo: boolean) => { setKo(isKo); try { document.cookie = `lang=${isKo ? 'ko' : 'en'};path=/;max-age=31536000`; } catch { /* noop */ } };
  const K = ko;
  return (
    <main className="landing research">
      <nav className="landing-nav">
        <span className="brand">Nepal <b>AI Twin</b><small>{K ? '연구 보고' : 'Research report'}</small></span>
        <div><button className={!ko ? 'is-active' : ''} onClick={() => chooseLang(false)}>EN</button><button className={ko ? 'is-active' : ''} onClick={() => chooseLang(true)}>한국어</button><Link href="/" className="nav-link">{K ? '홈' : 'HOME'}</Link><a href="/september" className="nav-link">{K ? '9월 지도' : 'SEPTEMBER MAP'}</a></div>
      </nav>

      <section className="hero">
        <p className="kicker">{K ? '연구 보고 · 2026년 6월 ~ 10월 · 실험 113건' : 'RESEARCH REPORT · JUN – OCT 2026 · 113 EXPERIMENTS'}</p>
        <h1>{K ? <>학습 없는 AI 모델 하나로 네팔 홍수를 쟀다. <em>무엇을 보고, 무엇을 못 보는지 확인했다.</em></> : <>One untrained AI model, used to measure Nepal’s floods. <em>We checked what it sees and what it misses.</em></>}</h1>
        <p className="sub">{K ? '요약. 공개된 지구관측 AI 모델(Ai2 OlmoEarth)을 학습 없이 그대로 쓰고, 레이더 위성 사진을 홍수 전 세 장과 후 한 장씩 넣어 "평소보다 얼마나 달라졌나"를 숫자 하나로 뽑았다. 이 숫자는 강이 넓어지거나 모래톱이 잠긴 곳을 잘 찾고, 유럽 코페르니쿠스의 운영 홍수지도와 큰 강에서 거의 같은 그림을 그린다(일치 점수 0.60). 그러나 얕게 넓게 퍼진 물은 못 보고, 위성이 지나간 뒤에 온 홍수는 당연히 못 본다. 모델을 더 크게 하거나, 다른 모델로 바꾸거나, 위치마다 다른 기준선을 써도 결과는 나아지지 않았다. 현장 정답 자료는 하나도 쓰지 않았다.' : 'Summary. We took a public Earth-observation AI model (Ai2 OlmoEarth) as released, with no training, fed it three radar images from before a flood and one from after, and reduced the output to a single number: how much more than usual did this place change. The number finds widened channels and drowned sandbars well, and on the big rivers it draws almost the same picture as the Copernicus operational flood map (agreement score 0.60). It cannot see shallow, spread-out water, and it cannot see a flood that arrived after the satellite passed. A bigger model, a different model and a per-location threshold did not improve it. No field ground truth was used.'}</p>
      </section>

      <section>
        <p className="kicker">{K ? '먼저, 용어 네 개' : 'FIRST, FOUR TERMS'}</p>
        <div className="rtable"><table>
          <tbody>
            <tr><td><b>{K ? '창' : 'Window'}</b></td><td>{K ? '지도를 2.56 km 네모로 자른 한 칸. 모든 숫자는 창 단위다.' : 'One 2.56 km square of the map. Every number is per window.'}</td></tr>
            <tr><td><b>{K ? '변화 점수' : 'Change score'}</b></td><td>{K ? '홍수 전 세 장의 평균과 홍수 후 한 장이 AI 모델 눈에 얼마나 다른가.' : 'How different the post-flood image looks to the model from the average of three pre-flood images.'}</td></tr>
            <tr><td><b>{K ? '평시 기준선' : 'Ordinary baseline'}</b></td><td>{K ? '홍수가 없던 날들로 똑같이 계산해 본 점수의 상위 1%. 이 선을 넘으면 "평소가 아니다"로 친다.' : 'The same score computed on flood-free dates; its top 1% is the line. Above it counts as “not ordinary”.'}</td></tr>
            <tr><td><b>{K ? '일치 점수(CSI)' : 'Agreement score (CSI)'}</b></td><td>{K ? '코페르니쿠스 홍수지도가 홍수라 한 창을 우리도 홍수라 했는가. 맞춘 수 ÷ (맞춘 + 놓친 + 헛짚은). 1이면 완전 일치.' : 'Did we flag the windows the Copernicus map flags? Hits ÷ (hits + misses + false alarms). 1 is perfect.'}</td></tr>
          </tbody>
        </table></div>
      </section>

      <section>
        <p className="kicker">{K ? '1 · 무엇을 했나' : '1 · WHAT WE DID'}</p>
        <h2>{K ? '모델을 고치지 않고, 자(기준)만 바꿔 가며 같은 숫자를 시험했다.' : 'We never changed the model. We changed the ruler and tested the same number again and again.'}</h2>
        <ul className="plain">
          <li><b>{K ? '무대' : 'Where'}</b>{K ? '2026년 8월 26일 라수와(보테코시) 홍수, 9~10월 테라이 다섯 강(나라야니·간다크·바그마티·코시·삽타리), 10월 11일 부디 간다키 홍수.' : 'The Rasuwa (Bhote Koshi) flood of 26 Aug 2026, five Terai rivers in Sep–Oct (Narayani, Gandak, Bagmati, Koshi, Saptari), the Budhi Gandaki flood of 11 Oct.'}</li>
          <li><b>{K ? '자료' : 'Data'}</b>{K ? 'Sentinel-1 레이더(구름을 뚫고 본다). 광학은 비교용으로만.' : 'Sentinel-1 radar, which sees through cloud. Optical imagery only for comparison.'}</li>
          <li><b>{K ? '기준' : 'Rulers'}</b>{K ? '유엔 UNOSAT 산사태 발원 폴리곤, 코페르니쿠스 운영 홍수지도(GFM), 수십 년 된 고전 레이더 물 지수, 다른 해(2024)의 같은 창.' : 'UN UNOSAT landslide source polygons, the Copernicus operational flood map (GFM), a decades-old classical radar water index, and the same windows in another year (2024).'}</li>
          <li><b>{K ? '변인' : 'What we varied'}</b>{K ? '모델 크기(1.4 M~308 M), 모델 가족(OlmoEarth·Galileo·TerraMind), 입력 단위, 기준선(전역 하나 vs 위치별), 해(2024·2026).' : 'Model size (1.4 M to 308 M), model family (OlmoEarth, Galileo, TerraMind), input unit, threshold (one global vs per-location), year (2024, 2026).'}</li>
        </ul>
      </section>

      <section>
        <p className="kicker">{K ? '2 · 알아낸 것 다섯' : '2 · FIVE FINDINGS'}</p>
        <h2>{K ? '큰 강은 보고, 얕은 물은 못 보고, 모델을 바꿔도 같다.' : 'It sees big rivers, misses shallow water, and a different model changes nothing.'}</h2>
        <h3>{K ? '① 큰 강에서는 운영 홍수지도와 같은 그림을 그린다.' : '① On big rivers it draws the same picture as the operational flood map.'}</h3>
        <p className="sub small">{K ? '나라야니 강을 따라 268구간을 세웠을 때 우리 순서와 코페르니쿠스 지도의 순서가 거의 같았다(순위상관 0.97). 다섯 강 중 넓어진 곳은 나라야니와 간다크 두 곳이고, 둘은 사실 한 수계다. 네 글자로 적으면 일치 점수 0.60이다. 홍수 나흘 뒤 다시 보니 큰 변화 9곳 중 8곳이 그대로였다. 물이 빠진 게 아니라 강 모양이 바뀐 것이다.' : 'Along 268 stretches of the Narayani our ranking almost matched the Copernicus map (rank correlation 0.97). Of five rivers, only Narayani and Gandak widened, and they are one river system. The agreement score is 0.60. Four days after the flood, 8 of 9 big changes were still there: the river had changed shape, not merely drained.'}</p>
        <h3>{K ? '② 얕게 퍼진 물은 못 본다. 이것이 거의 유일한 오류다.' : '② It does not see shallow, spread-out water. That is nearly the only error.'}</h3>
        <p className="sub small">{K ? '2026년 바그마티 강은 코페르니쿠스 지도에 24창이 홍수로 떴지만 우리는 0~1창만 잡았다. 2024년 바그마티의 큰 범람은 잡았다. 차이는 깊이와 모양이다. 강이 넓어지거나 모래톱이 잠기면 보이고, 논 위에 물이 얇게 깔리면 안 보인다. 고전 물 지수는 이걸 더 잘 보므로(0.62) 둘을 함께 쓰면 거짓 경보가 거의 없는 목록이 된다(정밀도 0.98).' : 'On the 2026 Bagmati the Copernicus map shows 24 flooded windows; we caught 0 to 1. The big 2024 Bagmati flood we did catch. The difference is depth and shape: a widened channel or a drowned bar is visible, a thin sheet of water over paddies is not. The classical water index sees that better (0.62), so using both gives a list with almost no false alarms (precision 0.98).'}</p>
        <h3>{K ? '③ 모델을 키우거나 바꿔도 답이 같다.' : '③ A bigger or different model gives the same answer.'}</h3>
        <p className="sub small">{K ? '라수와에서 OlmoEarth 네 크기(1.4 M~308 M)와 Galileo 세 크기가 모두 같은 발원지를 찾았다. 테라이에서 TerraMind large는 OlmoEarth와 같은 강을 같은 순서로 세웠고(순위상관 0.87, 일치 점수 0.61 vs 0.60) 바그마티도 똑같이 놓쳤다. 단 입력 단위를 틀리면 어느 모델이든 경고 없이 반대로 정렬된다. 표는 아래 "자세한 숫자"에.' : 'In Rasuwa all four OlmoEarth sizes (1.4 M to 308 M) and three Galileo sizes found the same source. In the Terai, TerraMind large ranked the same rivers in the same order as OlmoEarth (rank correlation 0.87, agreement 0.61 vs 0.60) and missed the Bagmati in the same way. With the wrong input unit, any model silently reverses its ranking. Tables are under “Detailed numbers” below.'}</p>
        <h3>{K ? '④ 위치마다 다른 기준선은 도움이 안 된다.' : '④ A per-location threshold does not help.'}</h3>
        <p className="sub small">{K ? '좌표를 넣으면 평소 흔들림을 예측하는 모델(MIND·SatCLIP·GeoCLIP) 네 가지를 시험했다. 라벨이 가까이 있을 땐 잘 맞지만, 한 강을 통째로 빼고 예측하면 네 모델 모두 위도·경도 2차식 수준(R² 0.21~0.27)에서 멈춘다. 그걸로 기준선을 바꾸면 일치 점수가 0.60에서 0.51로 떨어진다. 그래서 전역 기준선 하나를 유지한다.' : 'We tested four models that predict the ordinary wobble from coordinates (MIND, SatCLIP, GeoCLIP). With nearby labels they fit well, but when a whole river is held out all four stop at the level of a quadratic in latitude and longitude (R² 0.21–0.27). Using them lowers the agreement score from 0.60 to 0.51. So one global threshold stays.'}</p>
        <h3>{K ? '⑤ 타이밍은 모델 밖의 문제다.' : '⑤ Timing is outside the model.'}</h3>
        <p className="sub small">{K ? '10월 11일 부디 간다키 홍수 때 위성은 홍수파보다 27분 먼저 지나갔다. 12일마다 오는 레이더로는 메울 수 없는 틈이다. 매일 찍는 광학 위성이 들어갈 자리이고, 경쟁이 아니라 보완이다.' : 'On 11 October the satellite crossed the Budhi Gandaki 27 minutes before the flood wave. A 12-day radar revisit cannot close that gap; daily optical satellites fit there, as a complement rather than a rival.'}</p>
      </section>

      <section>
        <p className="kicker">{K ? '3 · 못 보는 것, 하지 않은 것' : '3 · WHAT IT MISSES, WHAT WE DID NOT DO'}</p>
        <ul className="plain">
          <li><b>{K ? '못 봄' : 'Misses'}</b>{K ? '얕은 범람, 둑 안에서 오르는 수위, 가옥 피해, 도로 사면. 뉴스 지점 5곳 중 수스타 한 곳만 보였다.' : 'Shallow flooding, rising stage inside the banks, house damage, road slopes. Of five places in the news only Susta was visible.'}</li>
          <li><b>{K ? '안 함' : 'Not done'}</b>{K ? '모델 학습, 현장 라벨, 피해 추정. 이 페이지의 숫자는 "어디를 먼저 볼지"의 순서이지 피해 규모가 아니다.' : 'No training, no field labels, no damage estimates. The numbers here are an order of where to look first, not a damage figure.'}</li>
          <li><b>{K ? '한계' : 'Caveats'}</b>{K ? '라수와 기준(발원 폴리곤 4창)은 통과/실패만 가른다. 좌표 시험은 유역 6개뿐이라 "도움이 안 된다"도 그 범위 안의 결론이다. 코페르니쿠스 지도 역시 모델 산출물이다.' : 'The Rasuwa ruler (4 source windows) only says pass or fail. The coordinate test had six basins, so “does not help” holds within that range. The Copernicus map is itself a model output.'}</li>
          <li><b>{K ? '철회' : 'Retracted'}</b>{K ? '8월 라수와 결과 하나는 입력 단위 결함으로 발표 다음 날 우리가 철회했다. 그 뒤로 단위 시험(M97)이 모든 실험에 들어간다.' : 'One August Rasuwa result had an input-unit flaw and we retracted it the day after posting. Since then a unit test (M97) is part of every run.'}</li>
        </ul>
      </section>

      <section>
        <p className="kicker">{K ? '4 · 연구가 걸어온 길 · 세 시기' : '4 · HOW THE WORK UNFOLDED · THREE PERIODS'}</p>
        <div className="rtable"><table>
          <thead><tr><th>{K ? '시기' : 'Period'}</th><th>{K ? '어디서' : 'Where'}</th><th>{K ? '무엇을 물었나' : 'Question'}</th><th>{K ? '무엇을 알았나' : 'What we learned'}</th></tr></thead>
          <tbody>
            <tr><td className="mono">M1–M65<br /><span className="muted">{K ? '6~7월' : 'Jun–Jul'}</span></td><td className="muted">{K ? '제주·한국·산사태 공개 데이터' : 'Jeju, Korea, public landslide datasets'}</td><td>{K ? '공개 AI 모델을 받은 그대로 믿어도 되나?' : 'Can a public AI model be trusted as released?'}</td><td>{K ? '아니오. 버전이 바뀌면 결과가 달라지고, 공식 데이터 분할에 누수가 있었다. 여기서 "먼저 적어 두고, 봉인하고, 틀리면 바로 철회"하는 규칙이 생겼다.' : 'No. A version change changed the results, and the official data split leaked. This is where the rule “write it down first, seal it, retract when wrong” was born.'}</td></tr>
            <tr><td className="mono">M66–M95<br /><span className="muted">{K ? '8~9월' : 'Aug–Sep'}</span></td><td className="muted">{K ? '라수와 8월 26일 홍수' : 'Rasuwa flood, 26 Aug'}</td><td>{K ? '학습 없이 "어디를 먼저 볼지"를 낼 수 있나?' : 'Without training, can we say where to look first?'}</td><td>{K ? '예. 100창 중 읽을 수 있는 47창, 그중 6곳을 골랐고 UNOSAT 발원 폴리곤이 그 안에 있었다(우연의 76배). 구름 때문에 광학이 못 읽은 50창을 레이더가 구제했다.' : 'Yes. Of 100 windows 47 were readable; we picked 6, and the UNOSAT source polygons were inside them (76× chance). Radar rescued 50 windows that cloud hid from optics.'}</td></tr>
            <tr><td className="mono">M96–M113<br /><span className="muted">{K ? '9~10월' : 'Sep–Oct'}</span></td><td className="muted">{K ? '테라이 다섯 강·부디 간다키' : 'Five Terai rivers, Budhi Gandaki'}</td><td>{K ? '모델·강·해·기준선을 바꿔도 버티나?' : 'Does it survive a change of model, river, year, threshold?'}</td><td>{K ? '버틴다. 위의 다섯 가지 결과가 이 시기의 것이다.' : 'It does. The five findings above come from this period.'}</td></tr>
          </tbody>
        </table></div>
      </section>

      <section>
        <p className="kicker">{K ? '5 · 실험 목록 · 질문과 답' : '5 · EXPERIMENT LIST · QUESTION AND ANSWER'}</p>
        <div className="rtable"><table>
          <thead><tr><th>#</th><th>{K ? '질문' : 'Question'}</th><th>{K ? '답' : 'Answer'}</th><th>{K ? '근거 숫자' : 'Evidence'}</th></tr></thead>
          <tbody>{ROWS.map((r) => <tr key={r.id}><td className="mono">{r.id}</td><td>{K ? r.q : r.q_en}</td><td><b>{K ? r.a : r.a_en}</b></td><td className="mono small muted">{K ? r.n : r.n_en}</td></tr>)}</tbody>
        </table></div>
        <p className="note">{K ? 'ρ는 순위상관(두 순서가 같으면 1, 반대면 −1). p는 우연히 그 결과가 나올 확률. R²는 예측이 설명하는 비율(1이 완전). 번호는 측정 장부의 절 번호.' : 'ρ is rank correlation (1 same order, −1 reversed). p is the chance of the result arising by luck. R² is the share explained by the prediction (1 is perfect). Numbers are ledger section ids.'}</p>
      </section>

      <section>
        <p className="kicker">{K ? '6 · 자세한 숫자' : '6 · DETAILED NUMBERS'}</p>
        <h3>{K ? '모델 크기와 가족 · 라수와 56창' : 'Model size and family · 56 Rasuwa windows'}</h3>
        <div className="rtable"><table>
          <thead><tr><th>{K ? '모델' : 'Model'}</th><th>{K ? '파라미터' : 'Params'}</th><th>{K ? 'OlmoEarth base와 순위상관' : 'ρ vs OlmoEarth base'}</th><th>{K ? '발원지 찾음?' : 'Found the source?'}</th></tr></thead>
          <tbody>
            {[['OlmoEarth nano', '1.4 M', '0.61', 'p 0.0018', false], ['OlmoEarth tiny', '6.2 M', '0.52', 'p 0.0020', false], ['OlmoEarth base', '89 M', '1.00', 'p 0.0020', false], ['OlmoEarth large', '308 M', '0.71', 'p 0.0019', false], ['Galileo nano', '—', '0.26', 'p 0.0019', false], ['Galileo tiny', '—', '−0.37', K ? '아니오 (p 1.0)' : 'no (p 1.0)', true], ['Galileo base', '—', '−0.07', 'p 0.0018', false], [K ? 'Galileo base · 단위 틀림' : 'Galileo base · wrong unit', '—', '−0.23', K ? '아니오 (p 0.12)' : 'no (p 0.12)', true]].map((r, i) => <tr key={i} className={r[4] ? 'fail' : ''}><td>{r[0] as string}</td><td className="mono">{r[1] as string}</td><td className="mono">{r[2] as string}</td><td className="mono">{r[3] as string}</td></tr>)}
          </tbody>
        </table></div>
        <p className="note">{K ? '발원 폴리곤에 닿는 창이 4개뿐이라 이 기준은 통과/실패만 가른다. 통과한 모델끼리의 우열은 말할 수 없다(M96·M98).' : 'Only four windows touch the source polygons, so this ruler only says pass or fail; it cannot rank the models that pass (M96, M98).'}</p>

        <h3>{K ? '세 번째 가족 TerraMind · 테라이 229창 · 일치 점수' : 'Third family, TerraMind · 229 Terai windows · agreement score'}</h3>
        <div className="rtable"><table>
          <thead><tr><th>{K ? '모델' : 'Model'}</th><th>{K ? '일치 (홍수 기준 5%)' : 'CSI (flood ≥5%)'}</th><th>3%</th><th>2%</th><th>{K ? 'OlmoEarth와 순위상관' : 'ρ vs OlmoEarth'}</th></tr></thead>
          <tbody>{TM.map((r) => <tr key={r[0]} className={r[5] ? 'fail' : ''}><td>{K ? r[0] : r[0].replace('단위 틀림', 'wrong unit')}</td><td className="mono">{r[1]}</td><td className="mono">{r[2]}</td><td className="mono">{r[3]}</td><td className="mono">{r[4]}</td></tr>)}</tbody>
        </table></div>
        <p className="note">{K ? 'TerraMind base는 상류 나라야니 한 구역에서 평시 기준선이 0.80까지 치솟아 그 강을 통째로 놓쳤다(원인 미확인). TerraMind는 한 장씩만 보는 모델이라 세 장 기억은 평균으로 대신했고, 격자가 160 m라 깃발 비율 자체는 비교하지 않는다(M113).' : 'TerraMind base lost the whole upper Narayani where its ordinary baseline rose to 0.80 (cause unknown). TerraMind sees one image at a time, so the three-image memory is a mean, and its 160 m grid means flag fractions are not compared directly (M113).'}</p>

        <h3>{K ? '세 가지 자 · 테라이 353창' : 'Three rulers · 353 Terai windows'}</h3>
        <div className="rtable"><table>
          <thead><tr><th>{K ? '자' : 'Ruler'}</th><th>{K ? '잘 보는 것' : 'Sees'}</th><th>{K ? '못 보는 것' : 'Misses'}</th><th>{K ? '일치 · 정밀도' : 'CSI · precision'}</th></tr></thead>
          <tbody>
            <tr><td>{K ? '임베딩 변화 점수' : 'Embedding change score'}</td><td>{K ? '넓어진 강, 잠긴 모래톱' : 'widened channels, drowned bars'}</td><td>{K ? '얕게 퍼진 물' : 'shallow sheets of water'}</td><td className="mono">0.54 · 0.92</td></tr>
            <tr><td>{K ? '고전 물 지수' : 'Classical water index'}</td><td>{K ? '새로 물에 덮인 땅' : 'newly water-covered ground'}</td><td>{K ? '구불구불한 하도(평시에도 23%까지 변함)' : 'meandering channels (up to 23% change on ordinary days)'}</td><td className="mono">0.62 · 0.95</td></tr>
            <tr><td>{K ? '둘 다 켜진 곳' : 'Both'}</td><td>{K ? '틀리지 않는 목록' : 'a list that is not wrong'}</td><td>{K ? '절반을 놓침(재현율 0.55)' : 'half the floods (recall 0.55)'}</td><td className="mono">— · 0.98</td></tr>
          </tbody>
        </table></div>

        <h3>{K ? '위치별 기준선 · 231창, 강 하나씩 빼고 예측' : 'Per-location thresholds · 231 windows, one river held out at a time'}</h3>
        <div className="rtable"><table>
          <thead><tr><th>{K ? '기준선' : 'Threshold'}</th><th>{K ? '빠진 강 예측 R²' : 'Held-out river R²'}</th><th>{K ? '일치 점수' : 'Agreement'}</th></tr></thead>
          <tbody>
            <tr><td>{K ? '전역 하나(현행)' : 'One global (current)'}</td><td className="mono">—</td><td className="mono"><b>0.60</b></td></tr>
            <tr><td>{K ? '위도·경도 2차식' : 'Lat/lon quadratic'}</td><td className="mono">0.23</td><td className="mono">—</td></tr>
            <tr><td>SatCLIP L10 / L40</td><td className="mono">0.26 / 0.27</td><td className="mono">—</td></tr>
            <tr><td>GeoCLIP</td><td className="mono">0.22</td><td className="mono">—</td></tr>
            <tr><td>MIND 64 / 256 / 3072</td><td className="mono">0.25 / 0.21 / 0.22</td><td className="mono">0.51</td></tr>
          </tbody>
        </table></div>
        <img src="/data/september/M111_mind_prior_figure.svg" alt={K ? '강 하나씩 뺀 예측 R²와 예측 대 실측' : 'Held-out R² and prediction vs measurement'} className="rfig" />
      </section>

      <section>
        <p className="kicker">{K ? '자료와 내려받기' : 'DATA AND DOWNLOADS'}</p>
        <p className="sub small">{K ? '자료: ESA Sentinel-1·Sentinel-2(Microsoft Planetary Computer), Copernicus GFM, UNOSAT 발원 폴리곤, OpenStreetMap 하천선. 모델: Ai2 OlmoEarth v1 Base, Galileo, TerraMind v1, MIND·SatCLIP·GeoCLIP 공개 가중치. 모든 숫자는 측정 장부 M1~M113에서 옮겨 적었다.' : 'Data: ESA Sentinel-1 and Sentinel-2 (Microsoft Planetary Computer), Copernicus GFM, UNOSAT source polygons, OpenStreetMap river lines. Models: Ai2 OlmoEarth v1 Base, Galileo, TerraMind v1, public MIND, SatCLIP and GeoCLIP weights. Every number is copied from measurement ledger sections M1–M113.'}</p>
        <div className="cta"><a className="btn primary" href="/data/research/RESEARCH_OVERVIEW.md" download>{K ? '전체 개관 M1~M113 (MD)' : 'FULL OVERVIEW M1–M113 (MD)'}</a><a className="btn" href="/data/research/STUDY_SUMMARY_M96-M113.md" download>{K ? '실험 요약 M96~M113 (MD)' : 'STUDY SUMMARY M96–M113 (MD)'}</a><a className="btn" href="/data/research/M111_mind_prior_note_en.md" download>{K ? '위치별 기준선 영문 노트 (MD)' : 'PER-LOCATION THRESHOLD NOTE (MD)'}</a><a className="btn" href="/september">{K ? '9월 지도로' : 'TO THE SEPTEMBER MAP'}</a></div>
      </section>
    </main>
  );
}
