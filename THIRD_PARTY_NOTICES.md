# Data, model and map notices

이 문서는 공개 번들에 표시되는 제3자 자료의 출처와 주장 경계를 정리합니다. 원본 상품의 라이선스가 이 저장소 코드 전체에 전이되는 것은 아닙니다.

| 항목 | 사용 | 출처·조건 |
|---|---|---|
| Sentinel-1 / Sentinel-2 | 사건 전후 입력과 공개 파생 시각화 | © European Union, Copernicus Sentinel data. Copernicus data access terms 적용 |
| OlmoEarth v1 Base | frozen 768-d Earth embedding 추출 | Allen Institute for AI. 모델 카드와 upstream 라이선스 적용 |
| Planet Disaster Data | 고해상도 참고 장면 — 앵커 3프레임 + 스캔 창별 크롭 97장 (`web/public/data/planet/`, 표시용 visual RGB만) | © Planet Labs PBC, Disaster Data Program. CC-BY-NC-4.0, 모든 노출 지점에 귀속 표기 |
| Copernicus DEM GLO-30 | 지형 단면·탐색적 계곡 지표 | Copernicus DEM 조건 적용 |
| OpenStreetMap | 하천 중심선·베이스 지리 | © OpenStreetMap contributors, ODbL |
| MapTiler / Esri | 대화형 베이스맵 | 각 제공자 attribution과 이용약관 적용 |
| Presto | 같은 패치의 보조 표현 대조 | NASA Harvest upstream 라이선스 적용 |
| USGS preliminary map | 외부 독립 평가의 예정 라벨·사건 맥락 | USGS 페이지가 Public Domain으로 표시. 현재 앱의 6개 순위 산출에는 사용하지 않음 |
| Sentinel Asia products | 독립 사후 대조 예정 | 각 다운로드 제품의 제공기관·이용조건을 개별 확인. 현재 순위 튜닝에 사용하지 않음 |

공개 GeoJSON의 `claim` 필드는 임베딩 변화에 따른 **검토 우선순위**임을 명시합니다. 피해 경계, 피해 면적, 인과, 확률로 재표현하지 마십시오.

이 저장소 자체의 코드 라이선스는 아직 선택되지 않았습니다. 공개 재사용을 허용하려면 별도의 `LICENSE`를 저작권자가 명시적으로 추가해야 합니다.

## UNOSAT / UNITAR rapid-mapping layers — CC-BY-SA-4.0

`web/public/data/unosat-*.geojson` are derived from the UNOSAT geodatabase for event
`FL20260826NPL` (Nepal, Rasuwa, 26 August 2026), obtained via the Humanitarian Data
Exchange on 2026-09-08:

- https://data.humdata.org/dataset/newly-formed-barrier-lakes-following-an-ice-rock-avalanche-in-rasuwa-district-nepal-as-of-
- https://data.humdata.org/dataset/mudflow-rockflow-extent-as-of-26-27-august-2026-in-rasuwa-district-bagmati-province-nepal

Layers used: `UNOSAT_Landsat9_20260826_DetachmentZone`, `UNOSAT_Cartosat3_20260828_BarrierLakes`,
`UNOSAT_Multisensor_20260826_20260828_FloodExtent`, `UNOSAT_Multisensor_20260826_20260828_AffectedRoads`,
`UNOSAT_Multisensor_20260826_20260828_AffectedBuildings`,
`UNOSAT_Multisensor_20260827_20260828_CulturalHeritage_Damage`.

Our published files reproject to WGS 84 and simplify geometry for web delivery; attributes
other than geometry are dropped. **Licence: CC-BY-SA-4.0.** These derived files are therefore
also distributed under CC-BY-SA-4.0, and are mapped by UNOSAT — not by this project. UNOSAT's
own attributes record `FieldValidation = 0` for these layers.

## Government of Nepal NDRRMA situation report — official publication

`web/public/data/official-event-record.json` quotes figures from *Rasuwa Flood Situation
Report #01*, NDRRMA, as of 2026-09-01 09:00 NPT:
https://ndrrma.gov.np/mediafiles/rasuwa/Rasuwa_Flood_SitRep_Temp_ENG_01_01092026.pdf
Quoted for reporting purposes with attribution and timestamp; not a product of this project.
