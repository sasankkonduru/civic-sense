# Implementation Plan - AI Municipal Command Center, Intelligence, Reputation & Demo Mode

This plan outlines the layout modifications, dynamic calculations, Leaflet overrides, and Demo Mode integration required to implement the **AI Municipal Command Center**, **Executive Intelligence System**, **Citizen Reputation System**, and **Hackathon Demo Mode** in the CivicSense frontend.

## 1. User Review Required

> [!IMPORTANT]
> - All Firestore schemas and database endpoints remain completely unchanged.
> - A global floating **Demo Mode Panel** is rendered in `App.tsx` (fixed bottom-right corner) to toggle the Hackathon presentation mode.
> - When **Demo Mode** is enabled, it merges the live Firestore data with the 20 high-fidelity geocoded seed issues from `seedData.ts`. This ensures a pristine 20+ issue dataset is visible while still allowing live report submissions to show up.
> - An interactive map toggle for "Satellite Heatmap View" renders soft blending density circles.

## 2. Proposed Changes

### Global Layout & Demo Toggle

#### [MODIFY] [App.tsx](file:///c:/Users/Sankar%20Konduru/Desktop/Sasank%20Konduru/develop/civic-sense/src/App.tsx)

- Declare a global `demoMode` state backed by `localStorage` persistence.
- Add a floating UI panel in the bottom-right corner (`fixed bottom-4 right-4 z-50`):
  - Glassmorphic design (`bg-slate-950/80 backdrop-blur border border-indigo-500/30`).
  - Active pulsing status ring (green for enabled, slate for disabled).
  - Switches `demoMode` state on click.
- Pass `demoMode` to all pages.

---

### Dashboard Component

#### [MODIFY] [DashboardPage.tsx](file:///c:/Users/Sankar%20Konduru/Desktop/Sasank%20Konduru/develop/civic-sense/src/components/DashboardPage.tsx)

- **Calculations & Seeding Override**:
  - Accept `demoMode` as a prop.
  - If `demoMode` is true, automatically run `seedDemoIssuesIfEmpty()` on mount.
  - Compute the display issues list as:
    ```typescript
    const displayIssues = demoMode
      ? [
          ...issues.filter(i => !i.id.startsWith("seed-issue-")),
          ...getSeededIssues()
        ]
      : issues;
    ```
  - Use `displayIssues` for City Health Score, Daily Brief filters, Resolution stats, and maps.

- **AI Municipal Command Center Panel (Bento Grid at Top)**:
  - **Left Section (Col-span 3)**: **City Health Score (0-100)** circular progress indicator.
  - **Middle Section (Col-span 5)**: **AI Municipal Daily Brief** (Gemini text or local fallback summary).
  - **Right Section (Col-span 4)**: **Resolution Performance** stats + **Emergency Alerts** alerts list.

- **Citizen Reputation System (For Citizen Users)**:
  - Render a **Citizen Reputation Profile** bento card for logged-in citizens displaying:
    - Badges: Bronze, Silver, Gold, or Civic Champion.
    - Points based on unique reports (+10), verified reports (+20), and resolved reports (+30).
    - Accuracy percentage and total resolved stats.

- **Executive Municipal Intelligence System (Analytics Panel)**:
  - Today / Week / Month timeframe selector.
  - Comparative list of **Infrastructure Health Score by City**.
  - Interactive SVG Category Trends Bar Chart.
  - **AI Trend Summary**: Fastest growing category, Highest risk city, Resolution bottlenecks, and Recommendations.

- **Leaflet Map Heatmap Integration**:
  - Header button overlay to toggle between "Satellite Heatmap View" and "Marker View".

- **Timeline Status Animations**:
  - Integrate spring and active pulsing ring animations into the drawer workflow timeline.

---

### Map Component

#### [MODIFY] [IssueMap.tsx](file:///c:/Users/Sankar%20Konduru/Desktop/Sasank%20Konduru/develop/civic-sense/src/components/IssueMap.tsx)

- Support `heatmapMode?: boolean` in `IssueMapProps`.
- If `heatmapMode` is active, render Leaflet `<Circle>` components at cluster points instead of standard marker icons:
  - Radius maps to density: `radius = 120 + cluster.issues.length * 90` meters.
  - Color maps to highest severity.
  - Apply semi-transparent styling: `fillOpacity = 0.45` to create natural blending overlays.

---

## 3. Verification Plan

### Automated Tests
- Run `npm run lint` to verify compilation.
- Run `npm run build` to package the production application.

### Manual Verification
- Toggle "Demo Mode" and confirm 20+ issues instantly populate the map and stats.
- Submit a new report and confirm it dynamically merges into the active demo list.
