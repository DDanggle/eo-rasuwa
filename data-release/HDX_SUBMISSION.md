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
