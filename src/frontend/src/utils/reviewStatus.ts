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
 * Get dates that have missed (overdue and incomplete) revisions
 * Returns a Set of date keys (YYYY-M-D format)
 */
export function getMissedRevisionDates(
  revisionSchedules: RevisionSchedule[],
  allPlannedDates: Array<{
    subTopicId: bigint;
    plannedDates: Time[];
  }>
): Set<string> {
  const now = new Date();
  const missedDates = new Set<string>();

  revisionSchedules.forEach(schedule => {
    // Find the planned dates for this subtopic
    const plannedData = allPlannedDates.find(
      item => item.subTopicId.toString() === schedule.subTopicId.toString()
    );

    if (!plannedData) return;

    // Check each revision (1-5) to see if it's incomplete and past due
    plannedData.plannedDates.forEach((date, index) => {
      const revisionDate = timeToDate(date);
      const isCompleted = schedule.reviewStatuses[index] || false;
      
      // If this revision is not completed and the date is in the past, mark it as missed
      if (!isCompleted && revisionDate < now) {
        const dateKey = getDateKey(revisionDate);
        missedDates.add(dateKey);
      }
    });
  });

  return missedDates;
}

/**
 * Get the revision number for a specific date in a subtopic's schedule
 * Returns the revision number (1-5) or null if the date doesn't match any revision
 */
export function getRevisionNumberForDate(
  plannedDates: Time[],
  targetDate: Date
): number | null {
  const targetKey = getDateKey(targetDate);
  
  for (let i = 0; i < plannedDates.length; i++) {
    const dateKey = getDateKey(timeToDate(plannedDates[i]));
    if (dateKey === targetKey) {
      return i + 1; // Revision numbers are 1-indexed
    }
  }
  
  return null;
}

/**
 * Check if a specific revision is completed
 */
export function isRevisionCompleted(
  schedule: RevisionSchedule,
  revisionNumber: number
): boolean {
  if (revisionNumber < 1 || revisionNumber > 5) return false;
  return schedule.reviewStatuses[revisionNumber - 1] || false;
}
