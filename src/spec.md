# Specification

## Summary
**Goal:** Implement manual revision completion workflow with visual indicators for missed revisions.

**Planned changes:**
- Update backend to mark revisions as completed only when explicitly reviewed by user, not automatically by date
- Add red visual indicators in calendar view for dates with unreviewed past revisions
- Add "Mark as Reviewed" button in TodayView dashboard for pending revisions
- Add "Mark as Reviewed" button in SubTopicScheduleView calendar dialog for pending revisions
- Ensure missed revisions transition from red (missed) to completed status when marked as reviewed

**User-visible outcome:** Users can manually mark revisions as reviewed from both the dashboard and calendar views, with missed revisions appearing in red until completed.
