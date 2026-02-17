# Specification

## Summary
**Goal:** Let users view revision items due for any selected date (including overdue items) and drill down to see a single subtopic’s revision schedule from the subtopics list.

**Planned changes:**
- Backend: Add a date-based due-items query that accepts a selected date and returns the authenticated user’s subtopics with `nextReview` on or before that date (due + overdue), in a stable, predictable order.
- Frontend (Today dashboard): Add a date selector to change the dashboard context from “today” to a chosen date; display overdue items and due-on-selected-date items with clear English labels, counts, and empty states.
- Frontend (Revision schedule navigation): Update Topics flow to prioritize subtopic list first and allow clicking any subtopic (including completed) to open a dedicated view showing only that subtopic’s revision schedule.

**User-visible outcome:** Users can pick a date on the Today dashboard to see everything due by that date (overdue + due that day), and from Topics they can click any subtopic (even completed) to view that subtopic’s revision schedule without having to view all subtopics’ schedules at once.
