# Specification

## Summary
**Goal:** Implement persistent red/green status indicators for revision sessions with manual marking functionality.

**Planned changes:**
- All revision schedules default to "not reviewed" state (red indicator) until manually marked by the user
- Add "mark as reviewed" action that changes revision status to green and persists in backend
- Display mark as reviewed functionality in both calendar view and topics section
- Show completion count for each topic indicating how many times it has been reviewed
- Red indicators remain until user explicitly marks the revision as reviewed, regardless of date

**User-visible outcome:** Users can manually mark revision sessions as reviewed in both the calendar and topics views, seeing immediate visual feedback with red (pending) and green (completed) status indicators, along with a count of completed reviews per topic.
