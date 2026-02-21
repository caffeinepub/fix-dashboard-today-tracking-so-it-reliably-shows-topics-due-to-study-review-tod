import { useMemo } from 'react';
import { useGetSubTopics, useGetRevisionSchedule, useGetPlannedRevisionDates, useRescheduleRevisionToNextDay, useMarkRevisionAsReviewed } from '../hooks/useQueries';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle2, Circle, Loader2, AlertCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Difficulty } from '../backend';
import { timeToDate } from '../utils/time';

const difficultyColors = {
  [Difficulty.easy]: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  [Difficulty.medium]: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  [Difficulty.hard]: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
};

interface SubTopicScheduleViewProps {
  subTopicId: bigint;
  onClose: () => void;
}

export default function SubTopicScheduleView({ subTopicId, onClose }: SubTopicScheduleViewProps) {
  const { data: subTopics } = useGetSubTopics();
  const { data: revisionSchedules } = useGetRevisionSchedule();
  const { data: plannedDates } = useGetPlannedRevisionDates(subTopicId);
  const rescheduleRevision = useRescheduleRevisionToNextDay();
  const markAsReviewed = useMarkRevisionAsReviewed();

  const subtopic = useMemo(() => {
    return subTopics?.find((st) => st.id === subTopicId);
  }, [subTopics, subTopicId]);

  const currentSchedule = useMemo(() => {
    return revisionSchedules?.find((rs) => rs.subTopicId === subTopicId);
  }, [revisionSchedules, subTopicId]);

  const scheduleData = useMemo(() => {
    if (!subtopic || !plannedDates || !currentSchedule) return null;

    const now = new Date();
    const studyDate = timeToDate(subtopic.studyDate);
    const nextReviewDate = timeToDate(currentSchedule.nextReview);

    // Check if current revision is overdue and not reviewed
    const isOverdue = nextReviewDate < now && !currentSchedule.isReviewed;

    // Build all revision dates with their status
    const allRevisionDates = plannedDates.map((date, index) => {
      const revisionDate = timeToDate(date);
      const isPast = revisionDate < now;
      const isCurrent = revisionDate.getTime() === nextReviewDate.getTime();
      
      return {
        date: revisionDate,
        index: index + 1,
        isPast,
        isCurrent,
        isReviewed: isCurrent ? currentSchedule.isReviewed : isPast,
      };
    });

    const completedCount = Number(currentSchedule.reviewCount);
    const totalCount = allRevisionDates.length;
    const remainingCount = totalCount - completedCount;

    return {
      studyDate,
      allRevisionDates,
      nextReviewDate,
      isOverdue,
      isReviewed: currentSchedule.isReviewed,
      completedCount,
      remainingCount,
      totalCount,
    };
  }, [subtopic, plannedDates, currentSchedule]);

  const handleReschedule = async () => {
    await rescheduleRevision.mutateAsync(subTopicId);
  };

  const handleMarkAsReviewed = async () => {
    await markAsReviewed.mutateAsync(subTopicId);
  };

  if (!subtopic || !scheduleData) {
    return null;
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{subtopic.title}</span>
            <Badge variant="outline" className={difficultyColors[subtopic.difficulty]}>
              {subtopic.difficulty}
            </Badge>
          </DialogTitle>
          <DialogDescription>{subtopic.mainTopicTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Summary with Review Count */}
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Revision Progress</span>
              <span className="text-sm text-muted-foreground">
                {scheduleData.completedCount} / {scheduleData.totalCount} completed
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${(scheduleData.completedCount / scheduleData.totalCount) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                {scheduleData.remainingCount} revision{scheduleData.remainingCount !== 1 ? 's' : ''} remaining
              </p>
              <Badge variant="outline" className="text-xs">
                Total reviews: {scheduleData.completedCount}
              </Badge>
            </div>
          </div>

          {/* Current Status */}
          {scheduleData.isOverdue && !scheduleData.isReviewed && (
            <div className="p-4 rounded-lg border-destructive bg-destructive/10 border">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-destructive mb-1">Not Reviewed - Overdue</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    This revision was due on {format(scheduleData.nextReviewDate, 'MMMM d, yyyy')}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleMarkAsReviewed}
                      disabled={markAsReviewed.isPending}
                    >
                      {markAsReviewed.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                      )}
                      Mark as Reviewed
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleReschedule}
                      disabled={rescheduleRevision.isPending}
                    >
                      {rescheduleRevision.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Calendar className="h-4 w-4 mr-1" />
                      )}
                      Redo Tomorrow
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!scheduleData.isReviewed && !scheduleData.isOverdue && (
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-start gap-3">
                <Circle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Next Revision - Not Yet Reviewed</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Scheduled for {format(scheduleData.nextReviewDate, 'MMMM d, yyyy')}
                  </p>
                  <Button
                    size="sm"
                    onClick={handleMarkAsReviewed}
                    disabled={markAsReviewed.isPending}
                  >
                    {markAsReviewed.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                    )}
                    Mark as Reviewed
                  </Button>
                </div>
              </div>
            </div>
          )}

          {scheduleData.isReviewed && (
            <div className="p-4 rounded-lg border bg-green-500/10 border-green-500/20">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-green-700 dark:text-green-400 mb-1">Reviewed ✓</h3>
                  <p className="text-sm text-muted-foreground">
                    This revision has been marked as reviewed
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Timeline */}
          <div>
            <h3 className="font-semibold mb-3">Revision Schedule</h3>
            <div className="space-y-3">
              {/* Study Date */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-green-700 dark:text-green-400">Study Date</span>
                    <span className="text-sm text-muted-foreground">
                      {format(scheduleData.studyDate, 'MMM d, yyyy')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Initial study completed</p>
                </div>
              </div>

              {/* Revision Dates */}
              {scheduleData.allRevisionDates.map((revision) => (
                <div
                  key={revision.index}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    revision.isReviewed
                      ? 'bg-green-500/10 border-green-500/20'
                      : revision.isPast
                      ? 'bg-destructive/10 border-destructive'
                      : 'bg-card border-border'
                  }`}
                >
                  {revision.isReviewed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  ) : revision.isPast ? (
                    <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${
                        revision.isReviewed
                          ? 'text-green-700 dark:text-green-400'
                          : revision.isPast
                          ? 'text-destructive'
                          : ''
                      }`}>
                        Revision {revision.index}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {format(revision.date, 'MMM d, yyyy')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {revision.isReviewed
                        ? 'Reviewed ✓'
                        : revision.isPast
                        ? 'Not reviewed - overdue'
                        : 'Scheduled'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
