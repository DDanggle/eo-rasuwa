# HDX 등록 절차 (사용자 계정 필요 — 폼에 붙여넣을 값 준비됨)

1. https://data.humdata.org 가입 (개인 계정, 무료)
2. 로그인 → "Add data" → 조직이 없으므로 **Request to create an organization**
   - Org name: `EO Rasuwa Project`
   - Description: Independent open-research project publishing satellite
     change-review priorities for the Aug 2026 Rasuwa flash flood, Nepal.
     Code and full correction ledger: https://github.com/DDanggle/eo-rasuwa
   - URL: https://eo-rasuwa.dev
   - (승인 보통 1–3일, OCHA HDX 팀 검토)
3. 승인 후 "Add data" → 아래 값으로:
   - **Title**: Nepal Rasuwa flash flood 2026 — satellite change-review priorities (unvalidated)
   - **Source**: EO Rasuwa Project (derived from ESA Copernicus Sentinel-2; Ai2 OlmoEarth)
   - **Contributor**: EO Rasuwa Project
   - **Date of dataset**: 2026-08-27 (observation) / ongoing
   - **Location**: Nepal
   - **License**: Creative Commons Attribution 4.0
   - **Methodology**: Other → methodology.md 본문 붙여넣기
   - **Caveats/Comments**: README.md 의 Caveats 절 붙여넣기 (UNVALIDATED 강조)
   - **Tags**: flooding, landslides, satellite imagery, damage assessment(제외 권장 — 오해 소지), geodata
   - **Files**: review-leads.geojson · candidates.geojson · change-ribbon.geojson · README.md · methodology.md
4. Visibility: Public

# Zenodo DOI (연구 인용용 — 10분, 즉시 발급)

1. https://zenodo.org 로그인 (GitHub 계정 연동 가능)
2. https://zenodo.org/account/settings/github/ 에서 `DDanggle/eo-rasuwa` 스위치 ON
3. GitHub에서 릴리스 태그 생성: 저장소 → Releases → "Draft a new release"
   - tag `v1.0.0`, 제목: "Rasuwa 2026 satellite triage — first public release"
   - 릴리스가 만들어지는 순간 Zenodo가 자동으로 아카이브 + DOI 발급
4. 발급된 DOI 배지를 README에 추가 (요청 시 제가 반영)

DOI가 생기면: 논문·리포트에서 이 데이터/코드가 인용 가능해지고,
"개인 사이트"가 아니라 "인용 가능한 연구 산출물"로 격이 바뀝니다.
