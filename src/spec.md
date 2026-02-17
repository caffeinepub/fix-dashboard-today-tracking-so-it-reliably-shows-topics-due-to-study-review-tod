# Specification

## Summary
**Goal:** Resolve the discrepancy between Calendar and Dashboard “to review” counts by clearly separating planned sessions from truly due/pending reviews, and by applying the same due/pending definition in both views.

**Planned changes:**
- Update Calendar view selected-day details to show separate counts for (1) planned items (study + planned revisions) and (2) due/pending reviews for that date (nextReview on selected date plus overdue carry-over), excluding completed subtopics.
- Adjust Calendar user-facing labels/text so planned revisions are not presented as “due,” using clear English wording to distinguish the categories.
- Ensure Dashboard (Today/selected-date) “to review” count and lists use the same due/pending definition as Calendar (due on selected date + overdue; exclude completed), so counts match when the same date is selected.

**User-visible outcome:** On any selected date, the Calendar clearly distinguishes planned items from due/pending reviews, and the Dashboard “to review” total matches the Calendar’s due/pending count for the same date, with completed subtopics not counted.
