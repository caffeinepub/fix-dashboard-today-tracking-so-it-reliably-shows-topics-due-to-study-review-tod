import { useState, useMemo } from 'react';
import { useGetSubTopics, useGetRevisionSchedule, useGetAllPlannedRevisionDates, useMarkRevisionAsReviewed } from '../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { Difficulty } from '../backend';
import { timeToDate, getDateKey } from '../utils/time';
import SubTopicScheduleView from './SubTopicScheduleView';
import { getMissedRevisionDates } from '../utils/reviewStatus';

const difficultyColors = {
  [Difficulty.easy]: 'bg-green-500',
  [Difficulty.medium]: 'bg-yellow-500',
  [Difficulty.hard]: 'bg-red-500',
};

export default function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSubTopicId, setSelectedSubTopicId] = useState<bigint | null>(null);

  const { data: subTopics, isLoading: subTopicsLoading } = useGetSubTopics();
  const { data: revisionSchedules, isLoading: schedulesLoading } = useGetRevisionSchedule();
  const { data: allPlannedDates, isLoading: plannedDatesLoading } = useGetAllPlannedRevisionDates();
  const markAsReviewed = useMarkRevisionAsReviewed();

  const isLoading = subTopicsLoading || schedulesLoading || plannedDatesLoading;

  // Get dates with missed (unreviewed past) revisions
  const missedRevisionDates = useMemo(() => {
    if (!revisionSchedules) return new Set<string>();
    return getMissedRevisionDates(revisionSchedules);
  }, [revisionSchedules]);

  // Build a map of dates to subtopics (study dates and planned revision dates)
  const dateToSubTopics = useMemo(() => {
    const map = new Map<string, Array<{ subtopic: any; difficulty: Difficulty; isStudyDate: boolean }>>();

    if (!subTopics || !allPlannedDates) return map;

    // Add study dates
    subTopics.forEach((subtopic) => {
      const dateKey = getDateKey(timeToDate(subtopic.studyDate));
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push({
        subtopic,
        difficulty: subtopic.difficulty,
        isStudyDate: true,
      });
    });

    // Add planned revision dates
    allPlannedDates.forEach((item) => {
      const subtopic = subTopics.find((st) => st.id === item.subTopicId);
      if (!subtopic) return;

      item.plannedDates.forEach((date) => {
        const dateKey = getDateKey(timeToDate(date));
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push({
          subtopic,
          difficulty: item.difficulty,
          isStudyDate: false,
        });
      });
    });

    return map;
  }, [subTopics, allPlannedDates]);

  // Get subtopics for selected date
  const subtopicsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = getDateKey(selectedDate);
    return dateToSubTopics.get(dateKey) || [];
  }, [selectedDate, dateToSubTopics]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleSubTopicClick = (subTopicId: bigint) => {
    setSelectedSubTopicId(subTopicId);
  };

  const handleCloseScheduleView = () => {
    setSelectedSubTopicId(null);
  };

  const handleMarkAsReviewed = async (subTopicId: bigint, e: React.MouseEvent) => {
    e.stopPropagation();
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
        <h2 className="text-2xl font-bold tracking-tight">Calendar View</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[200px] text-center font-semibold">
            {format(currentMonth, 'MMMM yyyy')}
          </div>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
            {day}
          </div>
        ))}

        {calendarDays.map((day) => {
          const dateKey = getDateKey(day);
          const items = dateToSubTopics.get(dateKey) || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const hasMissedRevision = missedRevisionDates.has(dateKey);

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDateClick(day)}
              className={`
                min-h-[100px] p-2 rounded-lg border transition-all
                ${isCurrentMonth ? 'bg-card' : 'bg-muted/30'}
                ${isToday ? 'border-primary border-2' : 'border-border'}
                ${isSelected ? 'ring-2 ring-primary' : ''}
                ${hasMissedRevision ? 'bg-destructive/10 border-destructive' : ''}
                hover:bg-accent/50
              `}
            >
              <div className={`text-sm font-medium mb-1 ${!isCurrentMonth ? 'text-muted-foreground' : ''}`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-1">
                {items.slice(0, 3).map((item, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full ${difficultyColors[item.difficulty]}`}
                  />
                ))}
                {items.length > 3 && (
                  <div className="text-xs text-muted-foreground">+{items.length - 3}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedDate && subtopicsForSelectedDate.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Topics for {format(selectedDate, 'MMMM d, yyyy')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {subtopicsForSelectedDate.map((item, idx) => {
              const schedule = revisionSchedules?.find(s => s.subTopicId === item.subtopic.id);
              const isMissed = schedule && !schedule.isReviewed && timeToDate(schedule.nextReview) < new Date();
              const isReviewed = schedule?.isReviewed || false;
              
              return (
                <div
                  key={`${item.subtopic.id.toString()}-${idx}`}
                  className={`p-3 rounded-lg border transition-colors ${
                    isMissed ? 'border-destructive bg-destructive/5' : 
                    isReviewed ? 'border-green-500/20 bg-green-500/5' : 'bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <button
                      onClick={() => handleSubTopicClick(item.subtopic.id)}
                      className="flex-1 text-left hover:opacity-80 transition-opacity"
                    >
                      <div className="flex items-center gap-2">
                        {isReviewed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                        ) : isMissed ? (
                          <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                        ) : null}
                        <h3 className="font-semibold truncate">{item.subtopic.title}</h3>
                        <Badge
                          variant="outline"
                          className={`
                            ${item.difficulty === Difficulty.easy ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' : ''}
                            ${item.difficulty === Difficulty.medium ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20' : ''}
                            ${item.difficulty === Difficulty.hard ? 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' : ''}
                          `}
                        >
                          {item.difficulty}
                        </Badge>
                        {isMissed && (
                          <Badge variant="destructive" className="text-xs">
                            Not Reviewed
                          </Badge>
                        )}
                        {isReviewed && (
                          <Badge className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                            Reviewed
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">{item.subtopic.mainTopicTitle}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {item.isStudyDate ? 'Study Date' : 'Revision'}
                        </p>
                        {schedule && (
                          <Badge variant="outline" className="text-xs">
                            {Number(schedule.reviewCount)} reviews completed
                          </Badge>
                        )}
                      </div>
                    </button>
                    {!isReviewed && isMissed && schedule && (
                      <Button
                        size="sm"
                        onClick={(e) => handleMarkAsReviewed(item.subtopic.id, e)}
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
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {selectedSubTopicId && (
        <SubTopicScheduleView
          subTopicId={selectedSubTopicId}
          onClose={handleCloseScheduleView}
        />
      )}
    </div>
  );
}
