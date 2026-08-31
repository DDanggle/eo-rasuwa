# Production deployment runbook

## 1. Release gate

`web/`에서 다음 명령이 모두 성공해야 합니다.

```bash
pnpm install --frozen-lockfile
pnpm check
```

이 게이트는 100/47/6 funnel, pooled-three-pair 점수, 6개 리드와 47개 전체 창의 분리, 300개 pre/post/delta PNG, MapLibre worker, Rust/WASM ABI, lint, typecheck, production build를 검사합니다.

## 2. Hosting configuration

Vercel 기준:

- Repository root: 이 저장소
- Root Directory: `web`
- Framework: Next.js
- Node.js: 22.x
- Install: `pnpm install --frozen-lockfile`
- Build: `pnpm build`
- Output: Next.js default

필수 환경변수는 없습니다. 권장값:

```text
NEXT_PUBLIC_SITE_URL=https://eo-rasuwa.dev
NEXT_PUBLIC_MAPTILER_KEY=domain-restricted-key
NEXT_PUBLIC_ENABLE_REVIEW_NOTES=false
```

MapTiler 키가 없으면 Esri 래스터 베이스맵으로 폴백합니다. 브라우저에 전달되는 `NEXT_PUBLIC_*` 값은 비밀이 아니므로 MapTiler 키는 배포 도메인 origin 제한과 사용량 제한을 설정합니다.

Supabase 리뷰는 공개 릴리스에서 끕니다. 내부 인증 리뷰가 필요할 때만 `0001`과 `0002_harden_candidate_reviews.sql`을 적용하고 인증 흐름을 붙인 뒤 세 변수를 설정합니다. 읽기·삽입 모두 `authenticated` 역할로 제한되어 있으며, CAPTCHA·rate limit 없이 익명 접근을 다시 허용하지 않습니다.

## 3. Preflight

- `git status --short`가 의도한 릴리스 변경만 보이는지 확인
- 배포할 commit SHA 기록
- `web/.env.local`이 추적되지 않는지 확인
- `NEXT_PUBLIC_SITE_URL`이 최종 HTTPS 도메인인지 확인
- MapTiler allowed origin 설정 또는 키 없이 Esri 폴백을 선택
- 125 MB `web/public/data`가 호스팅 한도 안인지 확인
- 코드 라이선스를 공개할지 결정. 현재는 라이선스 미선언 상태

## 4. Post-deploy smoke test

```bash
cd web
pnpm smoke -- https://eo-rasuwa.dev
```

이후 실제 브라우저에서 다음을 확인합니다.

- `/`: 100 → 47 → 6이 첫 화면에 보이고 6개 리드 다운로드가 열림
- `/map`: 베이스맵, 청록 100개 중심, 주황 6개 리드, 보라 재관측 창이 분리됨
- `/map?focus=v003`: Dalphedi로 이동하고 pre/post/AI Δ 전환이 동작함
- `/story`: 3개 평시쌍, M80, USGS/Sentinel Asia의 최신 다음 관문을 설명함
- 모바일 390×844: 좌우 rail이 지도를 가리지 않고 표는 가로 스크롤됨
- 키보드: lightbox `Esc`, 주요 링크·버튼 focus 표시, range input 조작

## 5. Rollback

호스팅 제공자의 직전 성공 deployment로 즉시 롤백하고, 실패한 deployment URL과 commit SHA를 기록합니다. 공개 결과 데이터만 바뀐 경우에도 UI만 되돌리지 말고 해당 commit 전체를 되돌려 `scenario.json`, GeoJSON, 문장이 한 계약으로 함께 움직이게 합니다.

## 6. Known release boundaries

- 외부 피해 지도에 대한 precision@k는 아직 미계산
- 사람 검토 라벨 0개
- 실시간 예측 또는 물리 hazard forecast가 아님
- `scenario.generated_at`은 데이터 snapshot 시간이지 웹 배포 시간은 아님
- 저장소에 git remote가 설정되지 않은 로컬 복제본에서는 배포 전에 정확한 원격 저장소를 연결해야 함
