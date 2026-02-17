import type { SubTopic, RevisionSchedule, Time } from '../backend';
import { getStartOfDate, getEndOfDate, timeToDate } from './time';

/**
 * Compute due and pending reviews for a specific date.
 * A subtopic is "due/pending" if its nextReview date is on or before the target date
 * and it is not completed.
 */
export function getDueReviewsForDate(
  targetDate: Date,
  subTopics: SubTopic[],
  revisionSchedules: RevisionSchedule[]
): {
  dueOnDate: SubTopic[];
  overdue: SubTopic[];
  total: number;
} {
  const startOfTarget = getStartOfDate(targetDate);
  const endOfTarget = getEndOfDate(targetDate);
  
  // Create a map of subTopicId -> nextReview for quick lookup
  const scheduleMap = new Map<string, Time>();
  revisionSchedules.forEach(schedule => {
    scheduleMap.set(schedule.subTopicId.toString(), schedule.nextReview);
  });

  const overdue: SubTopic[] = [];
  const dueOnDate: SubTopic[] = [];

  subTopics.forEach(subTopic => {
    // Skip completed subtopics
    if (subTopic.completed) return;

    // Get the nextReview date from schedule, fallback to studyDate
    const nextReview = scheduleMap.get(subTopic.id.toString()) || subTopic.studyDate;
    const reviewDate = timeToDate(nextReview);

    // Check if this review is due on or before the target date
    if (reviewDate <= endOfTarget) {
      // Categorize as overdue (before target date) or due on target date
      if (reviewDate < startOfTarget) {
        overdue.push(subTopic);
      } else {
        dueOnDate.push(subTopic);
      }
    }
  });

  return {
    overdue,
    dueOnDate,
    total: overdue.length + dueOnDate.length,
  };
}

/**
 * Get all planned items (study + revision sessions) for a specific date,
 * regardless of completion status. This is for calendar display purposes.
 */
export function getPlannedItemsForDate(
  targetDate: Date,
  subTopics: SubTopic[],
  allPlannedDates: Array<{
    subTopicId: bigint;
    difficulty: any;
    plannedDates: Time[];
  }>
): {
  studyItems: SubTopic[];
  revisionItems: Array<{ subTopic: SubTopic; plannedDate: Time }>;
  total: number;
} {
  const startOfTarget = getStartOfDate(targetDate);
  const endOfTarget = getEndOfDate(targetDate);

  const studyItems: SubTopic[] = [];
  const revisionItems: Array<{ subTopic: SubTopic; plannedDate: Time }> = [];

  // Track which subtopics we've already added to avoid duplicates
  const seenStudyIds = new Set<string>();
  const seenRevisionKeys = new Set<string>();

  // Add study dates
  subTopics.forEach(subTopic => {
    const studyDate = timeToDate(subTopic.studyDate);
    if (studyDate >= startOfTarget && studyDate <= endOfTarget) {
      const key = subTopic.id.toString();
      if (!seenStudyIds.has(key)) {
        seenStudyIds.add(key);
        studyItems.push(subTopic);
      }
    }
  });

  // Add planned revision dates
  allPlannedDates.forEach(item => {
    const subTopic = subTopics.find(st => st.id === item.subTopicId);
    if (!subTopic) return;

    item.plannedDates.forEach(plannedDate => {
      const date = timeToDate(plannedDate);
      if (date >= startOfTarget && date <= endOfTarget) {
        const key = `${item.subTopicId.toString()}-${plannedDate.toString()}`;
        if (!seenRevisionKeys.has(key)) {
          seenRevisionKeys.add(key);
          revisionItems.push({ subTopic, plannedDate });
        }
      }
    });
  });

  return {
    studyItems,
    revisionItems,
    total: studyItems.length + revisionItems.length,
  };
}
