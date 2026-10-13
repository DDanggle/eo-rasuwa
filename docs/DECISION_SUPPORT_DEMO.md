# Decision support demo

`/decision-support` is an independent ESCWA application portfolio demo within Nepal AI Twin. It is not an ESCWA or UN service or integration. It consumes the existing corrected optical review outputs, without rerunning the model or changing the study's published rankings.

The page compares 47 observable windows, identifies the six published leads and two partially observed re-observation priorities, and lets analysts select a list. The two re-observation priorities are part of the 47 observable windows, not the 53 unobservable windows.

Users can save a review status and note in this browser, then export the selected geometries and evidence as GeoJSON or a Markdown brief. The export includes exact pooled-three-pair scores, valid-token fractions, source SHA-256 hashes, observation dates, limitations, and user-supplied notes. A combined source hash versions local state. "Reviewed" never becomes a damage label. No notes are sent to a server.

Administrative boundaries, infrastructure and population have not been joined. These fields remain explicitly null in exports. Window geometries are not damage extents, overlapping windows must not be summed as area coverage, and the displayed pre-event image is an illustrative 12 August scene rather than the three-date scoring baseline. Radar fusion belongs to a separate experiment.

## Validation

Run from `web/`:

```sh
pnpm check
```

This includes `pnpm test:decision`, which checks the corrected scores, six published lead IDs, duplicate and invalid records, selection exports, missing context, browser-state validation, image-date disclosure, and re-observation membership. The normal asset invariants, lint, TypeScript and production build remain required.

Browser checks should cover EN/Korean, all 47 rows, the two re-observation priorities, search and sorting, map/list selection, empty selection, actual downloads, local-note restoration, 390 px layout, and the home-page link. No credentials or database setup are needed. When browser storage is unavailable, the current session and downloads remain usable.

Deployment uses the existing GitHub/Vercel path. New static data and UI must be deployed together; rollback is the previous deployment or the corresponding Git commit. The independent research data contract remains unchanged.
