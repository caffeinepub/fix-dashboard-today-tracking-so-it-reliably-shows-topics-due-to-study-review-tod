import { useMemo } from 'react';
import { useGetSubTopics, useGetRevisionSchedule, useGetPlannedRevisionDates, useRescheduleRevisionToNextDay, useMarkSpecificRevision, useUnmarkSpecificRevision } from '../hooks/useQueries';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Difficulty } from '../backend';
import { timeToDate } from '../utils/time';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  const markSpecificRevision = useMarkSpecificRevision();
  const unmarkSpecificRevision = useUnmarkSpecificRevision();

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

    // Build all revision dates with their status from reviewStatuses array
    const allRevisionDates = plannedDates.map((date, index) => {
      const revisionDate = timeToDate(date);
      const isPast = revisionDate < now;
      const isCompleted = currentSchedule.reviewStatuses[index] || false;
      
      return {
        date: revisionDate,
        revisionNumber: index + 1,
        isPast,
        isCompleted,
      };
    });

    const completedCount = Number(currentSchedule.reviewCount);
    const totalCount = allRevisionDates.length;
    const remainingCount = totalCount - completedCount;
    const incompleteCount = allRevisionDates.filter(r => !r.isCompleted).length;

    return {
      studyDate,
      allRevisionDates,
      completedCount,
      remainingCount,
      totalCount,
      incompleteCount,
    };
  }, [subtopic, plannedDates, currentSchedule]);

  const handleReschedule = async () => {
    await rescheduleRevision.mutateAsync(subTopicId);
  };

  const handleToggleRevision = async (revisionNumber: number, isCurrentlyCompleted: boolean) => {
    if (isCurrentlyCompleted) {
      await unmarkSpecificRevision.mutateAsync({ subTopicId, revisionNumber });
    } else {
      await markSpecificRevision.mutateAsync({ subTopicId, revisionNumber });
    }
  };

  if (!subtopic || !scheduleData) {
    return null;
  }

  const isPending = markSpecificRevision.isPending || unmarkSpecificRevision.isPending;
  const hasIncompleteRevisions = scheduleData.incompleteCount > 0;

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

          {/* Schedule Timeline */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Revision Schedule</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleReschedule}
                      disabled={rescheduleRevision.isPending || !hasIncompleteRevisions}
                    >
                      {rescheduleRevision.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Calendar className="h-4 w-4 mr-1" />
                      )}
                      Redo Tomorrow
                      {hasIncompleteRevisions && scheduleData.incompleteCount > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                          {scheduleData.incompleteCount}
                        </Badge>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      {hasIncompleteRevisions 
                        ? `Reschedule ${scheduleData.incompleteCount} incomplete revision${scheduleData.incompleteCount !== 1 ? 's' : ''} to tomorrow. Completed revisions will be preserved.`
                        : 'All revisions are completed. Nothing to reschedule.'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
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

              {/* Revision Dates with Mark/Unmark */}
              {scheduleData.allRevisionDates.map((revision) => (
                <div
                  key={revision.revisionNumber}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    revision.isCompleted
                      ? 'bg-green-500/10 border-green-500/20'
                      : revision.isPast
                      ? 'bg-destructive/10 border-destructive'
                      : 'bg-card border-border'
                  }`}
                >
                  {revision.isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  ) : revision.isPast ? (
                    <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${
                          revision.isCompleted
                            ? 'text-green-700 dark:text-green-400'
                            : revision.isPast
                            ? 'text-destructive'
                            : ''
                        }`}>
                          Revision {revision.revisionNumber}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            revision.isCompleted 
                              ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' 
                              : ''
                          }`}
                        >
                          {revision.isCompleted ? 'Complete' : 'Incomplete'}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(revision.date, 'MMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={revision.isCompleted ? 'outline' : 'default'}
                        onClick={() => handleToggleRevision(revision.revisionNumber, revision.isCompleted)}
                        disabled={isPending}
                        className="h-8"
                      >
                        {isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : revision.isCompleted ? (
                          <XCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        )}
                        {revision.isCompleted ? 'Unmark' : 'Mark Complete'}
                      </Button>
                      {revision.isPast && !revision.isCompleted && (
                        <span className="text-xs text-destructive">Overdue</span>
                      )}
                    </div>
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
