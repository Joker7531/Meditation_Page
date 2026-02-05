# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands
All commands should be run from the `app/` directory.

- **Start Dev Server**: `npm run dev` (Runs on http://localhost:3000)
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Unit/Component Tests**: `npm run test` (Vitest)
  - Run single test: `npx vitest run path/to/test`
- **E2E Tests**: `npm run test:e2e` (Playwright)
  - Run with UI: `npx playwright test --ui`

## Architecture Overview
This is a **Next.js App Router** application (MVP) implementing a 4-7-8 breathing meditation tool.

- **Core Logic**:
  - **Timing**: Driven by `requestAnimationFrame` for smooth animation.
  - **Breathing Cycle**: 4s Inhale / 7s Hold / 8s Exhale (19s total loop).
  - **State**: `elapsedActiveSec` is the source of truth.
  - **Persistence**: URL query params pass configuration (`durationMin`); `sessionStorage` is used for resilience (refresh) and passing summary data.

- **Routes**:
  - `/`: Landing (Duration selection).
  - `/meditation`: Active breathing session.
  - `/completion`: Summary and stats.

- **Stack**: TypeScript, Tailwind CSS, Zod (validation), Vitest (unit), Playwright (e2e).

## Directory Structure
- `app/app/`: Next.js App Router pages and layouts.
- `app/src/lib/`: Business logic (breathing timing, formatters).
- `app/src/components/`: React components (e.g., `BreathingCircle`).
- `memory-bank/`: **Source of Truth** for requirements and architecture.
  - `game-design-document.md`: Product specs.
  - `architecture.md`: Technical implementation details.
  - `implementation-plan.md`: Step-by-step progress tracker.

## Development Guidelines
- **Memory Bank**: Always check `memory-bank/` files before major architectural changes. Update `progress.md` and `architecture.md` when completing milestones.
- **Styling**: Use Tailwind CSS utility classes.
- **Testing**:
  - Write unit/component tests in `*.test.ts(x)` alongside source or in `tests/`.
  - Write E2E tests in `e2e/`.
  - Ensure accessibility (a11y) and reduced motion support are tested.
- **Formatting**: Code is formatted with Prettier and linted with ESLint.
