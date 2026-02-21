# Specification

## Summary
**Goal:** Filter the "redo tomorrow" functionality to only reschedule revisions that are not marked as completed.

**Planned changes:**
- Modify backend redo tomorrow logic to exclude revisions marked as completed (reviewStatuses[i] = true)
- Only reschedule revisions that are unmarked (reviewStatuses[i] = false)
- Preserve the reviewStatuses array for rescheduled revisions
- Update frontend to correctly call the filtered redo tomorrow functionality

**User-visible outcome:** When clicking "redo tomorrow", only incomplete revisions are rescheduled for the next day, while completed revisions remain unchanged.
