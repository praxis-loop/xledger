# Xledger Mobile iOS App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle Xledger's authenticated mobile shell and dashboard as an iOS-native-feeling PWA without changing business behavior.

**Architecture:** Add two focused presentational primitives and compose them into the existing dashboard. Keep responsive shell behavior in `TopBar`, `MobileNav`, `AppShell`, and global Tailwind tokens so desktop behavior remains intact.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 3, lucide-react, Vitest, Testing Library, Playwright, Docker Compose.

---

### Task 1: Mobile Design Primitives

**Files:**
- Create: `frontend/app/src/components/ui/segmented-control.tsx`
- Create: `frontend/app/src/components/ui/dashboard-metric-card.tsx`
- Create: `frontend/app/src/mobile-ios-design.test.tsx`

- [ ] Write failing tests for native radio semantics, controlled selection, Arrow-key behavior, reduced motion, and metric-card tones.
- [ ] Run `pnpm test -- mobile-ios-design.test.tsx` and confirm the expected missing-component failure.
- [ ] Implement the two components with Apple system colors, stable dimensions, and accessible state.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Mobile Shell

**Files:**
- Modify: `frontend/app/src/components/layout/app-shell.tsx`
- Modify: `frontend/app/src/components/layout/top-bar.tsx`
- Modify: `frontend/app/src/components/layout/mobile-nav.tsx`
- Modify: `frontend/app/src/styles.css`
- Modify: `frontend/app/tailwind.config.ts`
- Test: `frontend/app/src/mobile-ios-design.test.tsx`

- [ ] Add failing assertions for tab-bar navigation semantics and iOS UI markers.
- [ ] Remove viewport-width branching from `MobileNav` and expose active state with `aria-current`.
- [ ] Apply translucent top/bottom chrome, safe-area spacing, circular mobile icon controls, system fonts, grouped background, and contrast-safe action text.
- [ ] Run the focused test and existing app-shell tests.

### Task 3: Dashboard Composition

**Files:**
- Modify: `frontend/app/src/pages/dashboard-page.tsx`
- Test: `frontend/app/src/dashboard-pages.test.tsx`
- Test: `frontend/app/src/mobile-ios-design.test.tsx`

- [ ] Add failing assertions for segmented control and metric summary semantics.
- [ ] Replace inline period buttons and metric markup with the new primitives.
- [ ] Apply mobile grouped layout, compact typography, hairline surfaces, and touch-sized chart/action controls while retaining desktop breakpoints.
- [ ] Run dashboard tests and confirm range selection, chart behavior, and navigation still pass.

### Task 4: Full Verification And Deployment

**Files:**
- Modify only files required by verification findings.

- [ ] Run `pnpm run check`.
- [ ] Run `pnpm run build`.
- [ ] Update Playwright with a WebKit project while keeping business-flow scripts Chromium-only; add dedicated visual/accessibility CI matrix jobs that install both required browsers.
- [ ] Run the existing authenticated visual and accessibility specs under `e2e-tests`; treat serious and critical accessibility violations as failures.
- [ ] Capture and commit Chromium/WebKit screenshots at 320px, 767/768px, iPhone portrait/landscape, desktop, 200% zoom, and both English and Chinese; run accessibility audits at mobile and desktop viewports.
- [ ] Override all four `--safe-area-*` variables with nonzero values in portrait/landscape automation, then inspect screenshots for overflow, overlap, 44px targets, six-tab label fit, readable text, and desktop regressions.
- [ ] Commit intentionally and push `main`; on `dev@122.51.207.174:/opt/docker/xledger`, persist the host's current SHA to `.git/deploy-previous-sha`, fetch and fast-forward to the exact pushed SHA, verify `git rev-parse HEAD`, then rebuild with `sudo docker compose -f deploy/docker-compose.dev.yaml up -d --build xledger-frontend`.
- [ ] Verify public health, authenticated navigation, and service-worker activation at `https://xledger.xanne.cloud`; rollback with the clean-tree `git switch -C main "$PREVIOUS_SHA"` sequence in `deploy/README.md` if any gate fails.
