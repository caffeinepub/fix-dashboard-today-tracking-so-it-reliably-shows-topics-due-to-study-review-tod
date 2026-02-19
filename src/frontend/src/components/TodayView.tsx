import { useState, useMemo } from 'react';
import { useGetSubTopics, useGetRevisionSchedule, useUpdateRevisionSchedule } from '../hooks/useQueries';
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
  const updateRevisionSchedule = useUpdateRevisionSchedule();
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

    // Create a map of subTopicId -> nextReview for quick lookup
    const scheduleMap = new Map<string, bigint>();
    revisionSchedules.forEach(schedule => {
      scheduleMap.set(schedule.subTopicId.toString(), schedule.nextReview);
    });

    const dueTodayList: typeof subTopics = [];
    const overdueList: typeof subTopics = [];

    subTopics.forEach(subTopic => {
      // Skip completed subtopics
      if (subTopic.completed) return;

      // Get the nextReview date from schedule
      const nextReview = scheduleMap.get(subTopic.id.toString());
      if (!nextReview) return;

      const reviewDate = timeToDate(nextReview);

      // Check if this review is due on or before the selected date
      if (reviewDate <= endOfSelected) {
        // Categorize as overdue (before selected date) or due on selected date
        if (reviewDate < startOfSelected) {
          overdueList.push(subTopic);
        } else {
          dueTodayList.push(subTopic);
        }
      }
    });

    return { dueToday: dueTodayList, overdue: overdueList };
  }, [subTopics, revisionSchedules, selectedDate]);

  const totalCount = dueToday.length + overdue.length;

  const handleMarkCompleted = async (subTopicId: bigint) => {
    try {
      await updateRevisionSchedule.mutateAsync(subTopicId);
    } catch (error) {
      console.error('Failed to mark as completed:', error);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      setSelectedDate(newDate);
    }
  };

  const isToday = useMemo(() => {
    const today = startOfDay(new Date());
    const selected = startOfDay(selectedDate);
    return today.getTime() === selected.getTime();
  }, [selectedDate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {isToday ? "Today's Reviews" : 'Reviews for Selected Date'}
          </h2>
          <p className="text-muted-foreground mt-2">
            {totalCount === 0
              ? 'No reviews scheduled'
              : `${totalCount} ${totalCount === 1 ? 'review' : 'reviews'} needing attention`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={handleDateChange}
            className="px-3 py-2 border rounded-md text-sm bg-background"
          />
        </div>
      </div>

      {totalCount === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {isToday ? "You're all caught up!" : 'No reviews for this date'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {isToday ? 'No reviews scheduled for today' : 'Select a different date to view reviews'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Overdue Section */}
          {overdue.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <h3 className="text-xl font-semibold">Overdue / Missed</h3>
                <Badge variant="destructive" className="ml-2">
                  {overdue.length}
                </Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {overdue.map(subTopic => {
                  const schedule = revisionSchedules?.find(s => s.subTopicId === subTopic.id);
                  const nextReviewDate = schedule ? timeToDate(schedule.nextReview) : null;

                  return (
                    <Card key={subTopic.id.toString()} className="border-destructive/50 bg-destructive/5">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg line-clamp-2">{subTopic.title}</CardTitle>
                          <Badge variant="outline" className={difficultyColors[subTopic.difficulty]}>
                            {subTopic.difficulty}
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2">{subTopic.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">From:</span>
                          <span className="font-medium">{subTopic.mainTopicTitle}</span>
                        </div>
                        {nextReviewDate && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Due:</span>
                            <Badge variant="destructive" className="text-xs">
                              {format(nextReviewDate, 'MMM d, yyyy')}
                            </Badge>
                          </div>
                        )}
                        <Button
                          onClick={() => handleMarkCompleted(subTopic.id)}
                          disabled={updateRevisionSchedule.isPending}
                          className="w-full"
                          size="sm"
                        >
                          {updateRevisionSchedule.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Marking...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Mark as Reviewed
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Due Today Section */}
          {dueToday.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-semibold">
                  {isToday ? 'Due Today' : `Due on ${format(selectedDate, 'MMM d, yyyy')}`}
                </h3>
                <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
                  {dueToday.length}
                </Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {dueToday.map(subTopic => {
                  const schedule = revisionSchedules?.find(s => s.subTopicId === subTopic.id);
                  const nextReviewDate = schedule ? timeToDate(schedule.nextReview) : null;

                  return (
                    <Card key={subTopic.id.toString()}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg line-clamp-2">{subTopic.title}</CardTitle>
                          <Badge variant="outline" className={difficultyColors[subTopic.difficulty]}>
                            {subTopic.difficulty}
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2">{subTopic.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">From:</span>
                          <span className="font-medium">{subTopic.mainTopicTitle}</span>
                        </div>
                        {nextReviewDate && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Due:</span>
                            <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                              {format(nextReviewDate, 'MMM d, yyyy')}
                            </Badge>
                          </div>
                        )}
                        <Button
                          onClick={() => handleMarkCompleted(subTopic.id)}
                          disabled={updateRevisionSchedule.isPending}
                          className="w-full"
                          size="sm"
                        >
                          {updateRevisionSchedule.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Marking...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Mark as Reviewed
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
