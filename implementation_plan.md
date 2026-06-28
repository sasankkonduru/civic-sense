# Implementation Plan - AI Municipal Command Center, Intelligence & Reputation System

This plan outlines the layout modifications, dynamic calculations, and custom leaflet rendering overrides required to implement the **AI Municipal Command Center**, **Executive Intelligence System**, and **Citizen Reputation System** in the CivicSense frontend.

## 1. User Review Required

> [!IMPORTANT]
> - All Firestore schemas and database endpoints remain completely unchanged.
> - Calculations for the City Health Score, city-by-city infrastructure ratings, category trends, and citizen reputation points are computed in real-time on the client side directly from the geocoded issues stream.
> - Toggling the "Heatmap View" overlay renders soft blending circles at density centers, providing high-fidelity visual context.

## 2. Proposed Changes

### Dashboard Component

#### [MODIFY] [DashboardPage.tsx](file:///c:/Users/Sankar%20Konduru/Desktop/Sasank Konduru/develop/civic-sense/src/components/DashboardPage.tsx)

- **AI Municipal Command Center Panel (Bento Grid at Top)**:
  - **Left Section (Col-span 3)**: **City Health Score (0-100)** circular telemetry widget.
  - **Middle Section (Col-span 5)**: **AI Municipal Daily Brief** (Gemini text or local fallback summary).
  - **Right Section (Col-span 4)**: **Resolution Performance** stats + **Emergency Alerts** alerts list (flashing warning banners triggered by active leaks, garbage piles, or light clusters).

- **Citizen Reputation System (For Citizen Users)**:
  - Add a **Citizen Reputation Profile** bento card displaying:
    - Current Badge: **Bronze Reporter** (Bronze border), **Silver Reporter** (Silver border), **Gold Reporter** (Gold border), or **Civic Champion** (Holographic pulsing border).
    - Current Reputation Points with progress bar to next tier.
    - Key stats: **Total Reports**, **Resolved Reports**, and **Accuracy Rate**.
  - Points formula based on citizen reports:
    - Unique report (not duplicate): `+10 points`
    - Verified report (beyond "Reported" status): `+20 points`
    - Resolved report ("Resolved" / "Closed" status): `+30 points`

- **Executive Municipal Intelligence System (Bottom/Analytics Panel)**:
  - **Time Filter Controls**: Today / Week / Month selector.
  - **Dynamic Time Filtering**: Filters the active issues list before processing charts and AI trends.
  - **Infrastructure Health Score by City**: City-level scores calculated as:
    `100 - (criticalCount * 12 + openCount * 4)`, displayed in a comparative list.
  - **Interactive Category Trends Chart**: An interactive SVG Bar Chart displaying active counts for Potholes, Garbage, Water Leakages, Streetlights, and Road Damages, with hover tooltips and dynamic color codes.
  - **AI Trend Summary**:
    - **Fastest growing category**: Calculated as the category with the most issues in the filtered timeframe.
    - **Highest risk city**: City with the lowest health score.
    - **Resolution bottlenecks**: Department with the largest unassigned or unresolved queue.
    - **Infrastructure recommendations**: Dynamic operational recommendations based on active bottlenecks.

- **Leaflet Map Heatmap Integration**:
  - Add `heatmapMode` state variable and a header button overlay to toggle the view.
  - Pass `heatmapMode` to `IssueMap` component.

- **Triage Progress Timeline Animation**:
  - Animate the issue details progress timeline connector and dots with the spring and ring pulse animations.

---

### Map Component

#### [MODIFY] [IssueMap.tsx](file:///c:/Users/Sankar%20Konduru/Desktop/Sasank%20Konduru/develop/civic-sense/src/components/IssueMap.tsx)

- **Support `heatmapMode` Props**:
  Update `IssueMapProps` interface to accept `heatmapMode?: boolean`.
- **Render Heatmap Circles**:
  If `heatmapMode` is active, render Leaflet `<Circle>` components instead of marker popups:
  - Map cluster densities to circle sizes: `radius = 120 + cluster.issues.length * 90` meters.
  - Map cluster severity to colors: Red for Critical, Orange for High, Yellow for Medium.
  - Apply semi-transparent styling: `fillOpacity = 0.45` to allow overlapping layers to blend naturally like a GIS heatmap.

---

## 3. Verification Plan

### Automated Tests
- Run `npm run lint` to verify compilation.
- Run `npm run build` to package the production application.

### Manual Verification
- Verify that toggling "Heatmap View" displays blending circular density zones on the map.
- Verify that switching "Today", "Week", and "Month" filters correctly updates chart data and city health stats in real-time.
- Verify that a logged-in citizen's profile displays their reputation badge, accuracy percentage, and resolution count correctly.
