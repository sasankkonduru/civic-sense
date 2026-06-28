# Implementation Plan - AI Municipal Command Center & Intelligence System

This plan outlines the layout modifications, dynamic calculations, and custom Leaflet visualization overrides required to transform the CivicSense dashboard and map into a premium **AI Municipal Command Center & Intelligence System**, maintaining full compatibility with the existing Firestore database and Node.js backend.

## 1. User Review Required

> [!IMPORTANT]
> - All backend APIs and Firestore schemas will remain untouched.
> - The new executive widgets will be positioned at the top of the dashboard page (`DashboardPage.tsx`), replacing the current standalone Daily Brief block with a cohesive multi-column bento grid.
> - An interactive map toggle for "Satellite Heatmap View" will be introduced, shifting markers into large semi-transparent glowing overlays when active.

## 2. Proposed Changes

### Dashboard Component

#### [MODIFY] [DashboardPage.tsx](file:///c:/Users/Sankar%20Konduru/Desktop/Sasank%20Konduru/develop/civic-sense/src/components/DashboardPage.tsx)

- **AI Municipal Command Center Panel (Bento Grid at Top)**:
  - **Left Section (Col-span 3)**: **City Health Score (0-100)** circular telemetry widget.
  - **Middle Section (Col-span 5)**: **AI Municipal Daily Brief** (Gemini text or local fallback summary).
  - **Right Section (Col-span 4)**: **Resolution Performance** stats + **Emergency Alerts** alerts list (flashing warning banners triggered by active leaks, garbage piles, or light clusters).

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
