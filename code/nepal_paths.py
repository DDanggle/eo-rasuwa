"""Shared filesystem contract for the standalone Nepal research repository.

Large EO rasters and intermediate arrays are intentionally not tracked by Git.
Locally they live under ``research-private/artifacts``.  Existing server runs
may keep the historical ``artifacts`` layout, so callers can override the root
with ``NEPAL_ARTIFACT_ROOT`` without editing source code.
"""

from __future__ import annotations

import os
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
PRIVATE_ROOT = REPO_ROOT / "research-private"
WEB_DATA_ROOT = REPO_ROOT / "web" / "public" / "data"


def artifact_root() -> Path:
    """Return the active root for untracked experiment artifacts."""

    configured = os.environ.get("NEPAL_ARTIFACT_ROOT")
    if configured:
        return Path(configured).expanduser().resolve()

    legacy = REPO_ROOT / "artifacts"
    if (legacy / "external_data" / "nepal_olmo_live_v1").exists():
        return legacy
    return PRIVATE_ROOT / "artifacts"


ARTIFACT_ROOT = artifact_root()


def display_path(path: Path) -> str:
    """Use a repo-relative provenance path when possible, absolute otherwise."""

    resolved = path.resolve()
    try:
        return str(resolved.relative_to(REPO_ROOT.resolve()))
    except ValueError:
        return str(resolved)
