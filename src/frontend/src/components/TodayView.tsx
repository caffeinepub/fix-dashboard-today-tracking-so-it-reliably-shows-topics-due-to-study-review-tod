import { useState, useMemo } from 'react';
import { useGetSubTopicsForDate, useUpdateRevisionSchedule, useGetRevisionSchedule } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Loader2, AlertCircle, Calendar } from 'lucide-react';
import { Difficulty } from '../backend';
import { isBeforeDate, isOnDate, getDaysOverdue, dateToTime, getStartOfToday } from '../utils/time';

const difficultyColors = {
  [Difficulty.easy]: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  [Difficulty.medium]: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  [Difficulty.hard]: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
};

export default function TodayView() {
  const [selectedDate, setSelectedDate] = useState<Date>(getStartOfToday());
  const selectedDateEndOfDay = useMemo(() => {
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
  }, [selectedDate]);

  const targetTime = useMemo(() => dateToTime(selectedDateEndOfDay), [selectedDateEndOfDay]);
  const { data: subTopicsForDate, isLoading } = useGetSubTopicsForDate(targetTime);
  const { data: revisionSchedules } = useGetRevisionSchedule();
  const updateSchedule = useUpdateRevisionSchedule();

  // Create a map of subTopicId -> nextReview for quick lookup
  const scheduleMap = useMemo(() => {
    const map = new Map<string, bigint>();
    revisionSchedules?.forEach(schedule => {
      map.set(schedule.subTopicId.toString(), schedule.nextReview);
    });
    return map;
  }, [revisionSchedules]);

  // Categorize subtopics by their review status relative to selected date
  const categorizedTopics = useMemo(() => {
    if (!subTopicsForDate) return { overdue: [], dueOnDate: [] };

    const overdue = subTopicsForDate.filter(st => {
      if (st.completed) return false;
      const nextReview = scheduleMap.get(st.id.toString()) || st.studyDate;
      return isBeforeDate(nextReview, selectedDate);
    });

    const dueOnDate = subTopicsForDate.filter(st => {
      if (st.completed) return false;
      const nextReview = scheduleMap.get(st.id.toString()) || st.studyDate;
      return isOnDate(nextReview, selectedDate);
    });

    return { overdue, dueOnDate };
  }, [subTopicsForDate, scheduleMap, selectedDate]);

  const handleReview = (subTopicId: bigint) => {
    updateSchedule.mutate(subTopicId);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      setSelectedDate(newDate);
    }
  };

  const isToday = useMemo(() => {
    const today = getStartOfToday();
    return selectedDate.toDateString() === today.toDateString();
  }, [selectedDate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalPending = categorizedTopics.overdue.length + categorizedTopics.dueOnDate.length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight">Revision Dashboard</h2>
          <p className="text-muted-foreground mt-2">
            {totalPending === 0 
              ? isToday 
                ? "You're all caught up! No reviews due today." 
                : `No reviews due on ${selectedDate.toLocaleDateString()}`
              : `${totalPending} subtopic${totalPending !== 1 ? 's' : ''} to review`}
          </p>
        </div>
        <div className="flex flex-col gap-2 min-w-[200px]">
          <Label htmlFor="date-selector" className="text-sm font-medium">
            Select Date
          </Label>
          <Input
            id="date-selector"
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={handleDateChange}
            className="w-full"
          />
        </div>
      </div>

      {totalPending === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">
              {isToday ? 'No subtopics due or overdue' : `No subtopics due on ${selectedDate.toLocaleDateString()}`}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {isToday ? 'Add topics and schedule reviews to get started' : 'Try selecting a different date'}
            </p>
          </CardContent>
        </Card>
      )}

      {categorizedTopics.overdue.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <h3 className="text-xl font-semibold text-destructive">
              Overdue Reviews ({categorizedTopics.overdue.length})
            </h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {categorizedTopics.overdue.map((subTopic) => {
              const nextReview = scheduleMap.get(subTopic.id.toString()) || subTopic.studyDate;
              const daysOverdue = getDaysOverdue(nextReview);

              return (
                <Card key={subTopic.id.toString()} className="border-destructive/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg line-clamp-1">{subTopic.title}</CardTitle>
                        <CardDescription className="line-clamp-2 mt-1">
                          {subTopic.description}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className={difficultyColors[subTopic.difficulty]}>
                        {subTopic.difficulty}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="destructive" className="text-xs">
                        {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        from {subTopic.mainTopicTitle}
                      </span>
                    </div>
                    <Button
                      onClick={() => handleReview(subTopic.id)}
                      disabled={updateSchedule.isPending}
                      className="w-full"
                      variant="destructive"
                    >
                      {updateSchedule.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Completing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Complete Review
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

      {categorizedTopics.dueOnDate.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-semibold">
              {isToday ? 'Due Today' : `Due on ${selectedDate.toLocaleDateString()}`} ({categorizedTopics.dueOnDate.length})
            </h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {categorizedTopics.dueOnDate.map((subTopic) => (
              <Card key={subTopic.id.toString()} className="border-primary/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg line-clamp-1">{subTopic.title}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">
                        {subTopic.description}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className={difficultyColors[subTopic.difficulty]}>
                      {subTopic.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">
                      {isToday ? 'Due Today' : 'Due on selected date'}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      from {subTopic.mainTopicTitle}
                    </span>
                  </div>
                  <Button
                    onClick={() => handleReview(subTopic.id)}
                    disabled={updateSchedule.isPending}
                    className="w-full"
                  >
                    {updateSchedule.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Completing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Complete Review
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
