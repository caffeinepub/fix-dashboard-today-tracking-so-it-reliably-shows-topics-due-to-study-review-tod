import type { Time } from '../backend';

/**
 * Convert ICP Time (bigint nanoseconds) to JavaScript Date
 */
export function timeToDate(time: Time): Date {
  // ICP Time is in nanoseconds, convert to milliseconds
  return new Date(Number(time / 1_000_000n));
}

/**
 * Convert JavaScript Date to ICP Time (bigint nanoseconds)
 */
export function dateToTime(date: Date): Time {
  return BigInt(date.getTime()) * 1_000_000n;
}

/**
 * Get the start of today in the user's local timezone
 */
export function getStartOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

/**
 * Get the end of today in the user's local timezone
 */
export function getEndOfToday(): Date {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now;
}

/**
 * Get the start of a specific date in the user's local timezone
 */
export function getStartOfDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Get the end of a specific date in the user's local timezone
 */
export function getEndOfDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized;
}

/**
 * Check if a Time is before today (overdue)
 */
export function isOverdue(time: Time): boolean {
  const date = timeToDate(time);
  const startOfToday = getStartOfToday();
  return date < startOfToday;
}

/**
 * Check if a Time is before a specific date
 */
export function isBeforeDate(time: Time, targetDate: Date): boolean {
  const date = timeToDate(time);
  const startOfTarget = getStartOfDate(targetDate);
  return date < startOfTarget;
}

/**
 * Check if a Time is on a specific date
 */
export function isOnDate(time: Time, targetDate: Date): boolean {
  const date = timeToDate(time);
  const startOfTarget = getStartOfDate(targetDate);
  const endOfTarget = getEndOfDate(targetDate);
  return date >= startOfTarget && date <= endOfTarget;
}

/**
 * Check if a Time is today
 */
export function isToday(time: Time): boolean {
  const date = timeToDate(time);
  const startOfToday = getStartOfToday();
  const endOfToday = getEndOfToday();
  return date >= startOfToday && date <= endOfToday;
}

/**
 * Check if a Time is in the future
 */
export function isFuture(time: Time): boolean {
  const date = timeToDate(time);
  const endOfToday = getEndOfToday();
  return date > endOfToday;
}

/**
 * Format a Time as a readable date string
 */
export function formatDate(time: Time): string {
  return timeToDate(time).toLocaleDateString();
}

/**
 * Get days difference between a Time and today
 */
export function getDaysOverdue(time: Time): number {
  const date = timeToDate(time);
  const today = getStartOfToday();
  const diffMs = today.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Normalize a Date to start of day in local timezone
 */
export function normalizeToStartOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Generate a stable date key for grouping calendar events
 * Format: YYYY-M-D (using local timezone)
 */
export function getDateKey(date: Date): string {
  const normalized = normalizeToStartOfDay(date);
  return `${normalized.getFullYear()}-${normalized.getMonth()}-${normalized.getDate()}`;
}

/**
 * Convert ICP Time to a stable date key
 */
export function timeToDateKey(time: Time): string {
  return getDateKey(timeToDate(time));
}
