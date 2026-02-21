import { useState, useMemo } from 'react';
import { useGetSubTopics, useGetRevisionSchedule, useMarkRevisionAsReviewed } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle2, Loader2, AlertCircle, XCircle } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { Difficulty } from '../backend';
import { timeToDate, dateToTime } from '../utils/time';

const difficultyColors = {
  [Difficulty.easy]: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  [Difficulty.medium]: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  [Difficulty.hard]: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
};

export default function TodayView() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { data: subTopics, isLoading: subTopicsLoading } = useGetSubTopics();
  const { data: revisionSchedules, isLoading: schedulesLoading } = useGetRevisionSchedule();
  const markAsReviewed = useMarkRevisionAsReviewed();

  const isLoading = subTopicsLoading || schedulesLoading;

  const { overdueItems, dueTodayItems } = useMemo(() => {
    if (!subTopics || !revisionSchedules) {
      return { overdueItems: [], dueTodayItems: [] };
    }

    const selectedDateStart = startOfDay(selectedDate);
    const selectedDateTime = dateToTime(selectedDateStart);
    const now = new Date();
    const todayStart = startOfDay(now);

    const items = subTopics
      .map((subtopic) => {
        const schedule = revisionSchedules.find((s) => s.subTopicId === subtopic.id);
        if (!schedule) return null;

        const nextReviewDate = timeToDate(schedule.nextReview);
        const isOverdue = nextReviewDate <= selectedDateStart && !schedule.isReviewed;

        return {
          subtopic,
          schedule,
          nextReviewDate,
          isOverdue,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const overdue = items.filter(
      (item) => item.isOverdue && item.nextReviewDate < todayStart
    );

    const dueToday = items.filter(
      (item) => item.isOverdue && item.nextReviewDate >= todayStart && item.nextReviewDate <= selectedDateStart
    );

    return {
      overdueItems: overdue.sort((a, b) => a.nextReviewDate.getTime() - b.nextReviewDate.getTime()),
      dueTodayItems: dueToday.sort((a, b) => a.nextReviewDate.getTime() - b.nextReviewDate.getTime()),
    };
  }, [subTopics, revisionSchedules, selectedDate]);

  const handleMarkAsReviewed = async (subTopicId: bigint) => {
    await markAsReviewed.mutateAsync(subTopicId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Today's Revisions</h2>
          <p className="text-muted-foreground mt-2">
            Review your scheduled topics for {format(selectedDate, 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDate(new Date())}
            disabled={startOfDay(selectedDate).getTime() === startOfDay(new Date()).getTime()}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Today
          </Button>
        </div>
      </div>

      {overdueItems.length === 0 && dueTodayItems.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400 mb-4" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-sm text-muted-foreground mt-2">No revisions due for today</p>
          </CardContent>
        </Card>
      )}

      {overdueItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <h3 className="text-xl font-semibold text-destructive">Overdue / Missed</h3>
            <Badge variant="destructive">{overdueItems.length}</Badge>
          </div>
          <div className="space-y-3">
            {overdueItems.map((item) => (
              <Card key={item.subtopic.id.toString()} className="border-destructive bg-destructive/5">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                        <CardTitle className="text-lg">{item.subtopic.title}</CardTitle>
                        <Badge variant="outline" className={difficultyColors[item.subtopic.difficulty]}>
                          {item.subtopic.difficulty}
                        </Badge>
                      </div>
                      <CardDescription>{item.subtopic.mainTopicTitle}</CardDescription>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="destructive" className="text-xs">
                          Due: {format(item.nextReviewDate, 'MMM d, yyyy')}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {Number(item.schedule.reviewCount)} reviews completed
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleMarkAsReviewed(item.subtopic.id)}
                      disabled={markAsReviewed.isPending}
                      className="flex-shrink-0"
                    >
                      {markAsReviewed.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Mark as Reviewed
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {dueTodayItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">Due Today</h3>
            <Badge variant="secondary">{dueTodayItems.length}</Badge>
          </div>
          <div className="space-y-3">
            {dueTodayItems.map((item) => (
              <Card key={item.subtopic.id.toString()} className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="h-5 w-5 text-primary flex-shrink-0" />
                        <CardTitle className="text-lg">{item.subtopic.title}</CardTitle>
                        <Badge variant="outline" className={difficultyColors[item.subtopic.difficulty]}>
                          {item.subtopic.difficulty}
                        </Badge>
                      </div>
                      <CardDescription>{item.subtopic.mainTopicTitle}</CardDescription>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          Due: {format(item.nextReviewDate, 'MMM d, yyyy')}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {Number(item.schedule.reviewCount)} reviews completed
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleMarkAsReviewed(item.subtopic.id)}
                      disabled={markAsReviewed.isPending}
                      className="flex-shrink-0"
                    >
                      {markAsReviewed.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Mark as Reviewed
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
