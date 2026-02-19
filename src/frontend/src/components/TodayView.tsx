import { useState, useMemo } from 'react';
import { useGetSubTopics, useGetRevisionSchedule, useMarkRevisionAsReviewed } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { Difficulty } from '../backend';
import { timeToDate, dateToTime } from '../utils/time';

const difficultyColors = {
  [Difficulty.easy]: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  [Difficulty.medium]: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  [Difficulty.hard]: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
};

export default function TodayView() {
  const { data: subTopics, isLoading: subTopicsLoading } = useGetSubTopics();
  const { data: revisionSchedules, isLoading: schedulesLoading } = useGetRevisionSchedule();
  const markRevisionAsReviewed = useMarkRevisionAsReviewed();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const isLoading = subTopicsLoading || schedulesLoading;

  // Compute due today and overdue subtopics for the selected date
  const { dueToday, overdue } = useMemo(() => {
    if (!subTopics || !revisionSchedules) {
      return { dueToday: [], overdue: [] };
    }

    const startOfSelected = startOfDay(selectedDate);
    const endOfSelected = new Date(startOfSelected);
    endOfSelected.setHours(23, 59, 59, 999);

    const selectedTime = dateToTime(startOfSelected);
    const endTime = dateToTime(endOfSelected);

    // Create a map of subtopic IDs to their revision schedules
    const scheduleMap = new Map(
      revisionSchedules.map(schedule => [schedule.subTopicId.toString(), schedule])
    );

    // Filter subtopics that have unreviewed revisions
    const subtopicsWithPendingRevisions = subTopics
      .filter(subtopic => !subtopic.completed)
      .map(subtopic => {
        const schedule = scheduleMap.get(subtopic.id.toString());
        return { subtopic, schedule };
      })
      .filter(({ schedule }) => schedule && !schedule.isReviewed);

    const dueToday = subtopicsWithPendingRevisions
      .filter(({ schedule }) => {
        if (!schedule) return false;
        return schedule.nextReview >= selectedTime && schedule.nextReview <= endTime;
      })
      .map(({ subtopic }) => subtopic);

    const overdue = subtopicsWithPendingRevisions
      .filter(({ schedule }) => {
        if (!schedule) return false;
        return schedule.nextReview < selectedTime;
      })
      .map(({ subtopic }) => subtopic);

    return { dueToday, overdue };
  }, [subTopics, revisionSchedules, selectedDate]);

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleMarkAsReviewed = async (subTopicId: bigint) => {
    await markRevisionAsReviewed.mutateAsync(subTopicId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isToday = startOfDay(selectedDate).getTime() === startOfDay(new Date()).getTime();
  const dateLabel = isToday ? 'Today' : format(selectedDate, 'MMMM d, yyyy');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Revision Dashboard</h2>
          <p className="text-muted-foreground">Track your daily revision schedule</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => handleDateChange(new Date(e.target.value))}
            className="px-3 py-2 border rounded-md bg-background"
          />
        </div>
      </div>

      {overdue.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Overdue / Missed ({overdue.length})
            </CardTitle>
            <CardDescription>These revisions were scheduled before {dateLabel.toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overdue.map((subtopic) => {
              const schedule = revisionSchedules?.find(s => s.subTopicId === subtopic.id);
              return (
                <div
                  key={subtopic.id.toString()}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{subtopic.title}</h3>
                      <Badge variant="outline" className={difficultyColors[subtopic.difficulty]}>
                        {subtopic.difficulty}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{subtopic.mainTopicTitle}</p>
                    {schedule && (
                      <p className="text-xs text-destructive mt-1">
                        Due: {format(timeToDate(schedule.nextReview), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleMarkAsReviewed(subtopic.id)}
                    disabled={markRevisionAsReviewed.isPending}
                    className="ml-4"
                  >
                    {markRevisionAsReviewed.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Mark as Reviewed
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Due {isToday ? 'Today' : `on ${format(selectedDate, 'MMMM d')}`} ({dueToday.length})</CardTitle>
          <CardDescription>
            {dueToday.length === 0
              ? `No revisions scheduled for ${dateLabel.toLowerCase()}`
              : `Complete these revisions ${isToday ? 'today' : `on ${format(selectedDate, 'MMM d')}`}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {dueToday.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>All clear for {dateLabel.toLowerCase()}!</p>
            </div>
          ) : (
            dueToday.map((subtopic) => {
              const schedule = revisionSchedules?.find(s => s.subTopicId === subtopic.id);
              return (
                <div
                  key={subtopic.id.toString()}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{subtopic.title}</h3>
                      <Badge variant="outline" className={difficultyColors[subtopic.difficulty]}>
                        {subtopic.difficulty}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{subtopic.mainTopicTitle}</p>
                    {schedule && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Scheduled: {format(timeToDate(schedule.nextReview), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleMarkAsReviewed(subtopic.id)}
                    disabled={markRevisionAsReviewed.isPending}
                    className="ml-4"
                  >
                    {markRevisionAsReviewed.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Mark as Reviewed
                      </>
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
