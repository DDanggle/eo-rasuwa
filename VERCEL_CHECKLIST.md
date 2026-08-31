# Vercel 배포 체크리스트 (직접 실행용)

준비 상태는 2026-08-31 기준 `pnpm check` 통과(Node 22.16.0 / pnpm 11.19.0) 확인 완료.

## 0. 사전 확인 (완료됨)

- [x] `web/vercel.json` — framework/install/build 고정
- [x] `web/.env.example` — 대시보드에 넣을 환경변수 목록
- [x] `web/next.config.ts` — `/data/*` 에 CDN 장기 캐시 헤더 추가
- [x] `package.json engines.node = >=22.13.0` → Vercel 이 Node 22 를 자동 선택
- [x] `web/.env.local` 은 추적되지 않음

## 1. 저장소 연결 (택1)

**A. Vercel CLI (GitHub 불필요)**

```bash
npm i -g vercel
vercel login          # 브라우저 인증. 터미널에서 직접 실행
cd web
vercel link           # 새 프로젝트 생성
vercel --prod
```

**B. GitHub 연동 (push 마다 자동 배포)**

```bash
# github.com 에서 빈 private repo 생성 후
git remote add origin git@github.com:<user>/nepal-live-twin.git
git push -u origin master
```
그 다음 Vercel 대시보드 → Add New Project → 해당 repo import.

## 2. 프로젝트 설정

| 항목 | 값 |
| --- | --- |
| Root Directory | `web` |
| Framework Preset | Next.js |
| Node.js Version | 22.x |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm build` (prebuild 로 verify-assets 자동 실행) |
| Output Directory | (기본값) |

## 3. 환경변수

`web/.env.example` 의 5개를 Production + Preview 양쪽에 입력.
`NEXT_PUBLIC_SITE_URL` 은 처음엔 Vercel 기본 도메인, 커스텀 도메인 연결 후 교체하고 **재배포**해야 반영된다
(빌드 타임에 번들로 굳는 값이라 env 만 바꾸면 안 바뀜).

## 4. 배포 후 스모크

```bash
cd web
pnpm smoke -- https://<배포주소>
```

이후 `DEPLOYMENT.md` 4절의 브라우저 확인 항목 (`/`, `/map`, `/map?focus=v003`, `/story`, 390×844, 키보드) 수행.

## 5. 알려진 리스크

- `web/public/data` 125 MB. Hobby 플랜 배포 크기 한도에 걸리면 데이터를 외부 스토리지(예: R2/S3)로 분리하는 별도 작업 필요. 걸릴 경우 빌드 로그에 크기 초과로 표시된다.
- 로컬 기본 Node 는 18. 게이트를 돌릴 때는 `nvm use 22` 후 `corepack pnpm check`.
- 서버 기능 없음(전 페이지 static) — 서버리스 함수 한도는 해당 없음.
