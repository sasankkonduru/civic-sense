# Implementation Plan - AI Municipal Command Center Overhaul

This plan outlines the layout modifications and dynamic calculations required to transform the CivicSense dashboard into a premium **AI Municipal Command Center**, incorporating the requested executive widgets while maintaining full backend and database compatibility.

## 1. User Review Required

> [!IMPORTANT]
> - All backend API endpoints and Firestore structures will remain completely untouched.
> - The new executive widgets will be positioned at the top of the dashboard page (`DashboardPage.tsx`), replacing the current standalone Daily Brief block with a cohesive multi-column bento grid.

## 2. Proposed Changes

### Dashboard Component

#### [MODIFY] [DashboardPage.tsx](file:///c:/Users/Sankar%20Konduru/Desktop/Sasank%20Konduru/develop/civic-sense/src/components/DashboardPage.tsx)

- **Calculate City Health Score (0-100)**:
  Implement a dynamic client-side score computation using:
  ```typescript
  const openCount = issues.filter(i => i.status !== "Verified & Closed" && i.status !== "Closed").length;
  const criticalCount = issues.filter(i => i.severity === "Critical" && i.status !== "Verified & Closed" && i.status !== "Closed").length;
  const resolvedCount = issues.filter(i => i.status === "Verified & Closed" || i.status === "Closed").length;
  const totalCount = issues.length;
  const resolutionRate = totalCount > 0 ? (resolvedCount / totalCount) * 100 : 100;
  const avgTime = stats?.avgResolutionTime || 36;
  
  // Scoring formula
  const criticalPenalty = criticalCount * 8;
  const openPenalty = (openCount - criticalCount) * 2;
  const timePenalty = Math.max(0, (avgTime - 24) * 0.3);
  const healthScore = Math.max(10, Math.min(100, Math.round(100 - criticalPenalty - openPenalty - timePenalty)));
  ```
  Render this score using an animated SVG circular progress indicator with dynamic colored ring status bands (Green/Yellow/Red).

- **Assemble Executive Panel Grid**:
  Introduce a responsive bento grid (`grid grid-cols-1 lg:grid-cols-12 gap-6`) at the top of the dashboard main content view containing:
  - **Left Section (Col-span 3)**: City Health Score circular telemetry widget.
  - **Middle Section (Col-span 5)**: AI Municipal Daily Brief (Gemini or local fallback summary).
  - **Right Section (Col-span 4)**: Resolution Performance & Emergency Alerts list.

- **Emergency Alerts Trigger Check**:
  Evaluate active issues against target criteria:
  - Critical issues count $\ge 3$
  - Active "Water Leakage" reports $\ge 3$
  - Active "Garbage" reports $\ge 3$
  - Active "Broken Streetlight" reports $\ge 3$
  If tripped, render premium flashing alerts inside the right panel.

- **Triage Progress Timeline Animation**:
  Animate the issue details progress timeline connector and dots with the spring and ring pulse animations introduced in `OfficialPage.tsx`.

---

## 3. Verification Plan

### Automated Tests
- Run `npm run lint` to verify compilation.
- Run `npm run build` to package the production application.

### Manual Verification
- Confirm the City Health Score updates reactively as issues are filtered or solved.
- Validate that emergency alerts trigger dynamically when database thresholds are reached.
