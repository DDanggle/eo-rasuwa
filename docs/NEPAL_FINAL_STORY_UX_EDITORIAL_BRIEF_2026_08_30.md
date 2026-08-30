# Nepal 최종 공개판 — UX·기사 스토리 편집 브리프

2026-08-30 · 리서치·명세 전용 · UX 코드 변경 없음

## 한 문장 판정

현재 STORY modal은 이미 좋은 장문 기사다. 문제는 내용이 아니라 **입구와 위계**다.
첫 화면에서 사건·사람·위성 증거보다 연구 dashboard·후보 목록·게이트·지표가 먼저
경쟁한다. 최종판은 `기사 → 안내된 지도 → 자유 탐색 → 방법 부록`으로 순서를 뒤집어야 한다.

## 레퍼런스에서 가져올 편집 문법

### 1. 안수찬: 생각보다 구체적인 경험, 사실과 의견의 분리

안수찬은 기자의 추상적 생각보다 구체적이고 생생한 경험을 쓰고, 사실과 의견을 다른 궤도에
놓으라고 한다. 이 프로젝트에서는 다음으로 번역한다.

- `AI가 유용하다`를 설명하지 말고, 8월 12일과 27일의 같은 지점을 먼저 보여준다.
- `거대한 피해`라는 형용사 대신 끊긴 교량, 넓어진 하도, 퇴적물에 덮인 정착지를
  출처가 있는 before/after로 보여준다.
- 자체 현장 취재가 없으므로 생존자의 내면을 상상해 쓰지 않는다. 현장 서사는 AP·공식 대응
  보도로 출처를 밝힌 짧은 `FIELD REALITY` 영역에만 둔다.
- 모델 결과는 의견이 아니라 측정값으로, 해석은 별도 문장으로 분리한다.

근거: [안수찬, 〈칼럼 쓰지 맙시다2〉](https://v.daum.net/v/20260117123639824),
[안수찬의 narrative journalism 소개](https://www.ohmynews.com/NWS_Web/view/at_pg.aspx?CNTN_CD=A0001956677).

### 2. BBC Blatten: 한 문장 사건 → 한 사람의 감각 → before/after → 원리 → 공동체

BBC의 Swiss glacier 기사는 Nepal과 가장 가까운 참조다. 몇 백 년 있던 마을이 몇 초 사이
사라졌다는 단순한 lead 뒤에, 현장의 소리·정전·주민의 경험을 배치하고, 사진과 위성으로
스케일을 늘린 뒤, 마지막에 기후·빙하·영구동토와 공동체로 시야를 넓힌다.

Nepal에서도 순서는 `OLMo의 768차원`이 아니라 `산이 무너짐 → 물·얼음·암석이 협곡을
통과함 → 사람이 살던 곳이 변함 → 위성이 본 것 → AI가 더한 것 → 아직 모르는 것`이다.

근거: [BBC Visual Journalism, *The Swiss village wiped off the map by a glacier*](https://news.files.bbci.co.uk/include/newsspec/40680-swiss-avalanche/english/app).

### 3. BBC Verify: 전체 지도 → 검증된 지점 → 한 지점의 before/after

BBC Verify의 시각 기사는 모든 증거를 한 지도에 놓지 않는다. 지도로 전체 범위를 알려준 뒤,
검증된 지점을 조명하고, 그 지점의 기존 생활 공간과 before/after를 보여준다.

Nepal의 지도도 A–G·100개 창·도로·하천·검색 결과를 처음부터 동시에 보여주지 말고,
`전체 히말라야 속 위치 → 발원과 국경 → Syapru Besi/Bidur 한 곳`으로 폭을 줄여야 한다.

근거: [BBC Verify visual map/before-after sequence](https://news.files.bbci.co.uk/include/newsspec/41006-gaza-demolition/english/app).

### 4. 최신 Nepal 보도: 우리 앱이 놓친 것은 `사람`과 `지명이 가진 의미`다

AP와 Guardian의 최신 보도는 암반과 빙하가 함께 붕괴했다는 위성 해석을 보여주고, Syapru Besi,
Betrawati, Bidur를 `window ID`가 아니라 사람이 살던 장소로 호명한다. 현재 앱은 이 지명을
순위표의 label로 취급하는 경향이 있다.

- 사람의 피해 수치는 모델 증거와 분리한 `FIELD UPDATE · source · timestamp`에서만 보여준다.
- 사망·실종자 수는 빠르게 바뀌므로 히어로에 하드코딩하지 않는다.
- 현장 사진은 사용권을 확보한 자산만 쓴다. AP/Vantor 사진을 링크와 인용으로 참조하는 것과
  자체 페이지에 복제하는 것을 구분한다.

근거: [AP satellite account](https://apnews.com/article/climate-change-nepal-tibet-glacier-collapse-floods-b3eda9410f9941f69add384944047bc3),
[AP field reporting](https://apnews.com/article/nepal-china-flood-rescue-fde34c839b648f93f6aa011f044deb00),
[Guardian visual guide](https://www.theguardian.com/world/2026/aug/27/nepal-tibet-flash-flood-visual-guide-why-how-flooding-happened-floods-cause-reason-explained).

### 5. 지도 UX 연구: 자유 탐색보다 안내된 서사를 먼저

125명을 대상으로 한 지도 스토리 실험에서 longform/scrollytelling과 leader line이 기억·이해에
더 유리했다. 현재 프로젝트에서는 다음을 의미한다.

- 기사 중 지도는 자유 pan/zoom dashboard가 아니라 5개의 저자가 고정한 camera stop으로 운영한다.
- 각 stop에서 점·선·영역은 하나만 조명하고 나머지는 흐리게 한다.
- 자유 탐색 지도는 기사 맨 뒤의 `EXPLORE THE EVIDENCE`로 남긴다.

근거: [Visual Storytelling with Maps](https://cartographicperspectives.org/index.php/journal/article/view/1759),
[Reuters Institute, mobile visual storytelling](https://reutersinstitute.politics.ox.ac.uk/news/visual-storytelling-mobile-phones).

### 6. BBC GEL·trauma journalism: 아름다움보다 위계·접근성·존엄

- 색상만으로 확정/후보/미관측을 구분하지 않고 text label·shape·pattern을 함께 쓴다.
- 아이콘이 글을 대체하지 않는다. `A`, `E`, `O1`만으로는 일반 독자가 이해할 수 없다.
- 자동 흐름 animation은 기본 off로 두고, 플레이에 필요한 매개변수와 의미를 먼저 밝힌다.
- 현장 피해를 `멋진 disaster visualization`의 배경으로 사용하지 않는다. 시뮬레이션이 아닌 파티클은
  장식보다 오해 위험이 크다.

근거: [BBC GEL technical guidance](https://bbc.github.io/gel/),
[Dart Centre trauma journalism guide](https://resources.rsf.org/wp-content/uploads/2024/11/DARTCenter_JournoTraumaHandbook.pdf).

## 현재 화면 감사

### 이미 좋은 것

1. 현재 STORY hero의 serif 타이포그래피와 여백은 기사로서 강하다.
2. `위성이 본 것 / AI가 계산한 것 / 틀렸던 것 / 다음 관문`의 사실 계보는 프로젝트의 진짜 차별점이다.
3. Rasuwagadhi before/after swipe, source→downstream diagram, spectral small multiples는 의미가 분명하다.
4. 판독 실패와 S1 dB 오류를 감추지 않는 `WHAT WE GOT WRONG`은 흔치 않은 신뢰 자산이다.
5. 한국어/영어, reduced-motion, semantic heading의 기반이 이미 있다.

### 최종판을 막는 문제

1. **기사가 버튼 안에 숨어 있다.** 첫 방문자는 스토리가 아니라 dashboard를 본다.
2. **첫 지도의 시각 경쟁이 과도하다.** A–G, 100 windows, route particle, labels, legend, rail이 같은
   명도에서 경쟁한다.
3. **독자의 질문과 연구자의 질문이 섞인다.** `무슨 일이 있었나?`와 `AUROC·p99·sealed raster`가
   동시에 나온다.
4. **가장 중요한 Nepal 결과가 후보 순위에 묻힌다.** `계약 교정 live detection은 음성`이 위치상
   주장이어야 한다.
5. **`RADAR THROUGH CLOUD`가 실험 범위보다 강하다.** M78은 clear-S2로 시점을 골랐으므로
   public heading은 `WHEN OPTICAL IS MISSING: A RADAR TEST`가 맞다.
6. **`Live Twin`은 물리·예측을 연상시킨다.** 공개 헤더는 기사 제목으로, `OLMoEarth evidence explorer`는
   부제나 전문가 모드 이름으로 내린다.
7. **사람의 현실이 없다.** 현장 취재를 발명하면 안 되지만, 출처가 확실한 피해·구조 현재판을
   기사 도입과 마무리에 짧게 연결해야 한다.

## 최종 스토리보드 — 6단

### 0. HERO — 5초 안에 사건을 알게 한다

**권장 제목**

> 산이 무너진 뒤, 계곡은 다른 모습이 되었다

**권장 deck**

> 8월 26일 랑탕리룽에서 암반과 빙하가 함께 무너졌다. 위성으로 발원부터 트리슐리까지
따라갔다. OLMoEarth는 피해를 확정하지 않았다. 관측할 수 있던 47개 창을 다른 날보다
크게 달라진 순서로 정리했다.

Hero visual은 감성적 지도가 아니라 `Langtang Lirung before/after`의 정적 한 쌍이다. 버튼은
`위성 증거 따라가기` 하나, 보조로 `지도 열기`만 둔다.

### 1. ORIGIN — 지도를 열기 전에 발원부를 보여준다

- visual: 암반·빙하 붕괴 scar before/after, source polygon이 아닌 `best public estimate`
- copy: 진원이 아니라 **붕괴에서 발생한 지진파**로 표현한다. earthquake trigger라고 쓰지 않는다.
- interaction: scroll 1번에 히말라야 locator, 2번에 source close-up, 3번에 협곡 방향 leader line

### 2. CASCADE — 산사태가 아니라 연쇄 사건을 보여준다

`rock + ice → valley floor → water + debris → Rasuwagadhi → Trishuli`를 하나의 안내된 지도로 보여준다.
강선 파티클은 자동 재생하지 않고 `사건 경로 재생`을 누른 후에만 시작한다. 파티클을 보이기 전에
`하천 중심선을 따른 방향 표시이며, 실측 속도·수심·도달시간이 아님`을 표시한다.

### 3. PLACES — 한 번에 한 곳만 비교한다

순서는 `Rasuwagadhi → Syapru Besi → Bidur`의 3곳으로 제한한다.

- 각 지점은 `이 곳은 무엇이었나` 1문장 → before/after → `위성으로 확인/확인 불가`로 끝낸다.
- 중간에 field update를 하나만 둔다. 현장 취재사의 기사로 이동하는 링크이며 요약은 2문장을
  넘지 않는다.
- `w23`, `v003`, `45RUL`은 본문에서 숨기고 캡션/방법 부록에서만 보여준다.

### 4. MODEL — OLMo를 한 문장과 한 그림으로 설명한다

**핵심 문장**

> OLMoEarth는 산사태라고 답하지 않았다. 각 40m 셀이 그 자리의 평소보다 얼마나 달라졌는지
계산해, 사람이 먼저 볼 곳의 순서를 만들었다.

visual은 `PRE → 768-d token → POST → distance → ordinary range와 비교`의 5단계다. 현재 9행 AUROC 표는
`과거 9개 재해에서 AI가 고전 변화량보다 앞선 지역 9/9; 사전 마진 +.05 통과 8/9`의 작은 점그림으로
바꾸고, 전체 표는 `METHODS`로 내린다.

### 5. VERDICT — 성공보다 경계를 헤드라인으로 놓는다

**현재 판정**

> 위성 증거는 왔고, 후보 순서도 만들었다. 그러나 네팔 현장의 독립 피해경계가 없어 이것을
`탐지`나 `피해 지도`라고 부르지 않는다.

`WHAT WE GOT WRONG`은 남기되 연구실 로그가 아니라 일반 독자의 언어로 줄인다.

> 레이더 밝기 단위를 잘못 넣어 처음에는 변화를 보았다고 판독했다. 단위를 고쳐 다시 계산하자 그
결론은 사라졌다. 이 페이지는 처음 결과를 취소한 기록까지 보존한다.

### 6. HANDOFF — 기사의 끝에서 탐색을 연다

마지막에 버튼 세 개만 둔다.

1. `EXPLORE THE EVIDENCE` — 현재 full GIS dashboard
2. `READ THE METHOD` — M76–M78, input contract, metrics, source/licence
3. `OPEN FIELD SOURCES` — USGS/CEMS/WHO/AP 등 외부 현장·공식 보도

## Public·Expert 정보 위계

| Public story에 남김 | Explore map로 내림 | Methods로 내림 |
|---|---|---|
| 사건·장소·before/after | A–G 전체, 100-window candidate | 81 rasters, 768×64×64 |
| source→downstream 3단 | river/off-river/search filter | p99·placebo 정의 |
| OLMo가 한 일 1문장 | 후보별 pre/post/AI Δ | 9행 AUROC 전체표 |
| Nepal live는 미탐지 | timeline·scene picker | radar 7지역 전체표 |
| 오류를 취소한 이유 | provenance advanced rail | checksum·schema·code SHA |
| 현장·공식 소식 링크 | 자유 pan/zoom | M77/M78 한계·CI |

## 색·기호 계약

| 의미 | 색 | 형태 | 표기 |
|---|---|---|---|
| 공식/위성으로 확인된 물리 사건 | 적색 | 실선·채운 원 | `OBSERVED/REPORTED` |
| OLMo review candidate | orange | 빈 사각형·점선 | `AI CANDIDATE` |
| 하천·위성 관측 | blue | 실선 | `OBSERVATION` |
| 음성 개발 대조 | black/white | 이중 원 | `CONTROL` |
| cloud/snow/미관측 | grey | hatch | `NOT JUDGED` |
| 설계만/미실행 | neutral grey | dashed outline | `NOT RUN` |

보라색은 public story에서 제거하거나 하나의 의미만 준다. 현재처럼 `off-river`와 `장벽호 검색지`에
동시에 쓰면 이야기 문법이 깨진다.

## Interaction 계약

1. story는 기본 입구, map은 독자가 열는 두 번째 모드다.
2. story map은 scroll camera stop 5개만 사용하고 free pan/zoom을 끌 수 있다.
3. before/after는 swipe 외에 키보드 버튼 `BEFORE`, `AFTER`를 제공한다.
4. 자동 재생 없음. 애니메이션은 play/pause·reduced-motion·정적 대체 이미지를 모두 갖춘다.
5. 하나의 scroll step에 하나의 주장만 둔다. 카메라·레이어·copy가 동시에 바뀌지 않는다.
6. 스크롤 진행률은 보조이지 탐색 의미를 대체하지 않는다.
7. expert dashboard로 넘어갔다가 story로 돌아와도 읽던 section을 기억한다.

## Mobile 계약

- 390px에서 hero 제목은 4줄 이하, deck은 5줄 이하를 목표로 한다.
- 두 개 rail을 축소한 dashboard를 첫 화면으로 만들지 않는다.
- before/after 쌍은 1:1과 16:9를 혼용하지 않고 같은 crop·같은 날짜 표시를 보존한다.
- 표는 가로 스크롤보다 `2/7`, `0/7`, `9/9`의 요약 card + details로 변환한다.
- map label은 현재 stop에 필요한 1–2개만 노출한다.
- 링크·button touch target은 44px 이상, caption은 12px 이상을 목표로 한다.

## 윤리·저작권·claim 경계

1. BBC·AP·Guardian의 **편집 구조**를 참조하되 브랜드, 레이아웃, 문장, 사진을 복제하지 않는다.
2. AP/Vantor/Reuters 자산은 라이선스 없이 임베딩하지 않고 원문으로 링크한다.
3. Planet disaster data는 현재 명시된 non-commercial 조건을 공개 배포 전에 다시 검증한다.
4. 사망·실종·구조 수치는 `as of` 시각·기관·링크가 없으면 노출하지 않는다.
5. `earthquake` 대신 `collapse-generated seismic signal`을 쓴다. 지진이 붕괴를 유발했다고 쓰지 않는다.
6. `detected damage`, `flood extent`, `arrival time`, `digital twin`, `radar through cloud`는 현재 public claim에서 금지한다.
7. 현장 사진을 쓸 때는 피해자의 존엄과 맥락을 우선하고, hover·autoplay로 자극적 장면을
   반복하지 않는다.

## 최종 구현 순서

### P0 — 편집 구조

1. STORY를 공개 입구로 만들고 dashboard를 `EXPLORE`로 내린다.
2. hero에 source before/after와 위 제목·deck를 배치한다.
3. story의 우측 rail·전체 후보표·전체 radar table을 methods/explore로 이동한다.
4. 가장 중요한 판정 `Nepal live: not detected above ordinary variability`를 hero 아래에 한국어로 번역해 놓는다.

### P1 — 안내된 시각 서사

5. source→Rasuwagadhi→Syapru Besi→Bidur 5-stop sticky map을 만든다.
6. 각 stop의 문장·layer·camera를 1:1로 트리플로 고정한다.
7. AI 설명을 5단 개념도와 9/9 요약으로 줄인다.
8. `WHAT WE GOT WRONG`을 1개 단위 오류·1개 철회·1개 교훈으로 줄인다.

### P2 — 사람·접근성·배포

9. 사용 허가를 확인한 field visual 하나 또는 외부 보도 card 하나를 도입·마무리에 배치한다.
10. keyboard, screen reader, reduced motion, 390px, slow network, image failure를 같은 story order로 QA한다.
11. 공개 배포 직전 자산별 licence·source·timestamp·caption manifest를 봉인한다.
12. 전문가 3명, 비전문가 5명에게 5초·1분·5분 회상 테스트를 한다.

## 최종 QA 질문

### 5초

- 무슨 일이 어디서 있었는지 말할 수 있는가?
- 이 페이지가 공식 재난 제품이 아니라 연구 조사임을 알 수 있는가?

### 1분

- 위성이 본 것과 OLMo가 한 일을 구분할 수 있는가?
- AI가 피해를 탐지했다고 오해하지 않는가?
- 모델의 첫 레이더 결론이 왜 취소됐는지 설명할 수 있는가?

### 5분

- source→impact→downstream의 공간 관계를 복원할 수 있는가?
- M76 음성, M77 개발 대조, M78 조건부 radar viability의 차이를 알 수 있는가?
- 현장 검증·더 깊은 평시 baseline·cloud-stratified radar가 다음 작업임을 알 수 있는가?

## 완료 조건

- 최초 화면에서 후보 표·레이더 표·연구 게이트가 보이지 않는다.
- 제목·deck·source before/after만으로 사건이 설명된다.
- public story에는 한 section당 핵심 수치가 최대 하나다.
- `탐지`, `확률`, `피해 면적`, `시뮬레이션`, `digital twin`, `radar through cloud`의 오해가 없다.
- 각 image에 source·date·sensor·license·AI input 여부가 있다.
- 색상을 제거해도 확정/후보/미관측/미실행을 구분할 수 있다.
- 390px·keyboard·screen reader·reduced motion에서 같은 이야기 순서가 보존된다.
- 기사의 끝에서만 자유 GIS·methods·source ledger를 연다.

