# Specification

## Summary
**Goal:** Show revision completion progress and per-session completion/overdue status in the Subtopic Schedule dialog.

**Planned changes:**
- Update `frontend/src/components/SubTopicScheduleView.tsx` to display a progress indicator for the subtopic’s revisions completed out of total planned revisions (denominator based on the existing planned revision sessions, excluding the initial “Study Date”; completed count capped to the total).
- Update the schedule list styling in `frontend/src/components/SubTopicScheduleView.tsx` to visually indicate session status: completed sessions in green, overdue (past date and not completed) sessions in red, and today/upcoming uncompleted sessions in a neutral style, with any labels in English.

**User-visible outcome:** When viewing a subtopic’s schedule, users see how many revisions they’ve completed out of the total (e.g., “4/5” or “1/5 remaining”) and can quickly identify which scheduled sessions are completed (green), overdue (red), or upcoming (neutral).
