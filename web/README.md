# Web application

This directory contains the public Next.js interface for the Nepal AI Twin. The release contract is:

> 100 Sentinel-2 windows scanned → 47 observable → 6 review leads → 0 confirmed damage labels.

The six leads rank places for human inspection; they are not damage detections, probabilities, or mapped impact area. The application reads the sealed public derivatives in `public/data/` and does not rebuild research data during deployment.

## Local release check

Node.js 22.13+ and pnpm 11.19.0 are expected.

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm start
```

`pnpm check` verifies the public data contract and all 300 candidate images, then runs ESLint, TypeScript, and a production Next.js build.

## Routes

- `/` — concise 100 → 47 → 6 explanation and downloadable review list
- `/map` — interactive evidence map and scene timeline
- `/map?focus=v003` — deep link to the first review lead
- `/story` — bilingual methods and evidence narrative

Environment variables and production hosting steps are documented in [`../DEPLOYMENT.md`](../DEPLOYMENT.md). Scientific claims, boundaries, and source links are documented in the repository [`README`](../README.md) and [`../THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).
