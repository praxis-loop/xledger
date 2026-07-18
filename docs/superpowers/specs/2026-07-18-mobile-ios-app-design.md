# Xledger Mobile iOS App Design

## Goal

Make the authenticated mobile experience feel at home on iPhone while preserving Xledger's existing React, Tailwind, routing, data fetching, translations, and desktop layouts.

## Design Direction

Use Apple Human Interface Guidelines as the visual baseline and treat Konsta UI as a component reference only. The implementation remains a small project-owned Tailwind layer, with no Ionic, Framework7, or Konsta runtime dependency.

The visual system uses:

- Apple system fonts (`-apple-system`, `BlinkMacSystemFont`, `SF Pro Text`, and `PingFang SC`).
- The iOS grouped background (`#f2f2f7`) and white content surfaces.
- Contrast-safe iOS blue (`#0066cc`) for normal-size action text, with Apple blue (`#007aff`) reserved for icons, indicators, and non-text emphasis. System green and red retain financial meaning.
- Hairline borders, restrained shadows, 8px-or-smaller card radii where practical, and 44px minimum interactive targets.
- Translucent top navigation chrome plus an opaque, readable tab bar with four-edge safe-area padding.

## Mobile Shell

The top bar becomes compact navigation chrome below the 1000px shell threshold. At and above that threshold, the desktop shell exposes a compact search field plus notification/help controls; the wider account treatment remains reserved for `xl`. The 1000px threshold leaves room for Safari's scrollbar-adjusted viewport at a 1024px device width. Language stays a native select, while install, profile, and logout actions use circular symbol buttons with accessible labels.

The bottom navigation remains six destinations but becomes an iOS-style tab bar with concise labels. It uses a stable height plus bottom/left/right safe-area insets, an opaque white surface for legibility, Apple-blue active state, muted inactive state, and no JavaScript viewport check. CSS responsive visibility keeps it correct after viewport changes and during tests.

## Dashboard

The dashboard's first section stops reading as one large web card on mobile. It becomes an unframed grouped page with:

1. A compact navigation-title block.
2. A native-feeling segmented period control using radio semantics and an animated selected surface.
3. A compact two-column income/expense summary followed by a full-width balance surface.
4. Grouped action-center and trend sections with smaller headings, white surfaces, hairline separators, and touch-sized actions.

At `md` and above, the page retains the current roomy dashboard composition. Data ranges, calculations, chart interaction, routing, translations, and API behavior do not change.

## Components

- `SegmentedControl`: controlled generic selector built from native radio inputs and labels, preserving native Arrow-key behavior, focus, and a stable 44px mobile height.
- `DashboardMetricCard`: compact financial metric surface with positive, negative, and balance tones.
- Existing `Button`, `PageSection`, and `MetricCard`: align typography, radius, focus states, and colors with the new system without changing their public behavior.
- `TopBar`, `MobileNav`, and `AppShell`: own navigation chrome and safe-area layout.

## Accessibility And States

Controls keep visible focus rings, semantic roles, translated accessible names, and reduced-motion behavior. Selected tab and segment states are exposed with `aria-current` and native radio state. Normal-size action text meets WCAG AA contrast. Existing loading, empty, error, dialog, and offline states remain functional.

## Verification

- Component tests cover segmented selection, metric tones, and mobile navigation semantics.
- Existing dashboard and app-shell tests must continue to pass.
- `pnpm run check` and `pnpm run build` must pass.
- Existing authenticated visual and accessibility suites cover 320px width, 767/768px breakpoint edges, landscape, 200% zoom, English, Chinese, Chromium, WebKit, and mobile/desktop accessibility viewports. New Chromium/WebKit baselines are committed with the implementation.
- Safe-area CSS is routed through `--safe-area-top`, `--safe-area-bottom`, `--safe-area-left`, and `--safe-area-right`, which default to matching `env()` values and can be overridden by automation. An iPhone/PWA device check follows because desktop emulation does not reproduce all iOS viewport behavior.
- GitHub Actions installs Chromium and WebKit for dedicated visual/accessibility jobs. Existing business-flow matrix jobs remain Chromium-only to avoid doubling unrelated CI work.
- The test server checkout at `dev@122.51.207.174:/opt/docker/xledger` persists the host's previous SHA to `.git/deploy-previous-sha`, fetches and fast-forwards to the exact pushed SHA, then rebuilds with `deploy/docker-compose.dev.yaml`. `deploy/README.md` contains the executable verification and rollback sequence.
