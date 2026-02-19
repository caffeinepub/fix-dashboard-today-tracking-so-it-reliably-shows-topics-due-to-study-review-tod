import type { SubTopic, RevisionSchedule, Time } from '../backend';
import { timeToDate, getDateKey } from './time';

/**
 * Get subtopics that are due or pending for a specific date
 */
export function getDueSubTopicsForDate(
  subTopics: SubTopic[],
  revisionSchedules: RevisionSchedule[],
  targetDate: Date
): SubTopic[] {
  const scheduleMap = new Map(
    revisionSchedules.map(schedule => [schedule.subTopicId.toString(), schedule])
  );

  const targetTime = targetDate.getTime();

  return subTopics
    .filter(subtopic => !subtopic.completed)
    .filter(subtopic => {
      const schedule = scheduleMap.get(subtopic.id.toString());
      if (!schedule) return false;
      
      const reviewDate = timeToDate(schedule.nextReview);
      return reviewDate.getTime() <= targetTime;
    });
}

/**
 * Get subtopics planned for a specific date (study date or revision date)
 */
export function getPlannedSubTopicsForDate(
  subTopics: SubTopic[],
  allPlannedDates: Array<{
    subTopicId: bigint;
    plannedDates: Time[];
  }>,
  targetDate: Date
): SubTopic[] {
  const targetKey = getDateKey(targetDate);
  const plannedSubTopicIds = new Set<string>();

  // Check study dates
  subTopics.forEach(subtopic => {
    const studyDateKey = getDateKey(timeToDate(subtopic.studyDate));
    if (studyDateKey === targetKey) {
      plannedSubTopicIds.add(subtopic.id.toString());
    }
  });

  // Check planned revision dates
  allPlannedDates.forEach(item => {
    item.plannedDates.forEach(date => {
      const dateKey = getDateKey(timeToDate(date));
      if (dateKey === targetKey) {
        plannedSubTopicIds.add(item.subTopicId.toString());
      }
    });
  });

  return subTopics.filter(subtopic => 
    plannedSubTopicIds.has(subtopic.id.toString())
  );
}

/**
 * Get dates that have missed (overdue and unreviewed) revisions
 * Returns a Set of date keys (YYYY-M-D format)
 */
export function getMissedRevisionDates(revisionSchedules: RevisionSchedule[]): Set<string> {
  const now = new Date();
  const missedDates = new Set<string>();

  revisionSchedules.forEach(schedule => {
    // Only include if not reviewed and the date is in the past
    if (!schedule.isReviewed) {
      const reviewDate = timeToDate(schedule.nextReview);
      if (reviewDate < now) {
        const dateKey = getDateKey(reviewDate);
        missedDates.add(dateKey);
      }
    }
  });

  return missedDates;
}
