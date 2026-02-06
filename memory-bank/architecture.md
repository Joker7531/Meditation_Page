# Architecture

## Overview
This repository contains a runnable **Next.js App Router** application under `app/` implementing the MVP 3-page 4-7-8 breathing flow. The canonical product requirements and stepwise checklist live in `memory-bank/`.

## Architecture Insights (File Roles)

### `memory-bank/implementation-plan.md`
- The executable work plan for the MVP.
- Breaks delivery into small steps and pairs each step with a verification method (unit/component/e2e/manual).
- Contains key implementation decisions in **Step 0.2** (e.g., `durationMin` via query + sessionStorage fallback, rAF-driven timing, reduced-motion policy, size budget definition).

### `memory-bank/implementation-plan-raw.md`
- The original uncorrupted source version of the implementation plan (clean UTF-8 Chinese).
- Use as the baseline if encoding/formatting issues appear in the edited plan.

### `memory-bank/game-design-document.md`
- Product requirements source (GDD).
- Defines pages/flows (Landing/Meditation/Completion), breathing timing rules (4-7-8 = 19s cycle), metrics, and acceptance criteria.

### `memory-bank/tech-stack.md`
- Intended technical stack for the MVP (Next.js App Router, TypeScript, Tailwind, Zod, Vitest/RTL/Playwright, ESLint/Prettier, Vercel).

### `memory-bank/progress.md`
- Running log of work performed and verification status.
- Update after completing milestones or after running test suites.

### `memory-bank/architecture.md`
- Architecture summary for the eventual codebase.
- Should describe the runtime design once code exists (routing structure, state/timing model, animation strategy, test strategy, build/perf budget, and any persisted data).

## Runtime Architecture (current implementation)

### Routes
- `/` Landing: duration selection and validation (presets 5/10/15, custom 1–60 integer)
- `/meditation` Meditation: runs 4-7-8 breathing loop with rAF-driven active timer
- `/completion` Completion: shows summary (elapsed time, endReason, completed cycles), including dual-info early-ended hint

### Data contract (routing + storage)
- Landing → Meditation: `durationMin` passed via query (`/meditation?durationMin=10`), also written to `sessionStorage` for refresh resilience.
- Meditation → Completion: a summary blob is written to `sessionStorage` (`breathing:lastSummary`); completion can also read minimal query values when present.
- Test-only override: `/meditation?...&__testDurationSec=N` shortens target duration for E2E.

### Timing + state model
- Timer source of truth: `requestAnimationFrame` updates `elapsedActiveSec` while running.
- Pause semantics: paused time is excluded; phase and visuals freeze.
- Phase derivation: `elapsedActiveSec % 19` determines inhale/hold/exhale windows.
- Reduced motion: timer + text unchanged; visual scaling becomes discrete per phase.

### Visuals
- **Design System**: Deep blue radial gradient background and centered layouts unified across all routes (Landing, Meditation, Completion).
- **Typography**: `Caveat` (handwritten) used for "human" layer (Titles, Prompts, Controls, Key Metrics); `Inter` for functional data/labels.
- **Interactions**: Buttons use "emotional design" cues (breathing glow, tactile scale press) to invite interaction.
- **Warmup**: dedicated phase with a full-screen dark overlay and a zoom-in countdown animation (3-2-1) before the session begins.
- **Breathing circle**: scaling follows 0.8→1.2→0.8 across 4/7/8 seconds with a radial ripple effect.
- **Particles**: P0 deterministic 50-dot layout + ~180 background particles.

### Tests
- Unit: `src/lib/breathing.ts` boundaries and formatting.
- RTL: landing validation, completion rendering, particle count.
- E2E: route smoke, full flow, phase timing windows (tolerant), keyboard Tab order and focus visibility (Step 6.1).

## Notes
- Test artifacts are written to `app/test-results/` and are intentionally not committed.
