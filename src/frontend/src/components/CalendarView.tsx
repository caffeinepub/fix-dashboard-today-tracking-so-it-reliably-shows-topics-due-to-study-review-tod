import { useState, useMemo } from 'react';
import { useGetAllPlannedRevisionDates, useGetSubTopics } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIconLucide } from 'lucide-react';
import { format } from 'date-fns';
import { Difficulty } from '../backend';
import { getDateKey, timeToDate } from '../utils/time';

const difficultyColors = {
  [Difficulty.easy]: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  [Difficulty.medium]: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  [Difficulty.hard]: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface CalendarEvent {
  subTopicId: bigint;
  difficulty: Difficulty;
  date: Date;
  type: 'study' | 'revision';
}

export default function CalendarView() {
  const { data: allPlannedDates, isLoading: datesLoading } = useGetAllPlannedRevisionDates();
  const { data: subTopics, isLoading: subTopicsLoading } = useGetSubTopics();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const isLoading = datesLoading || subTopicsLoading;

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [currentDate]);

  // Build calendar events map with proper de-duplication
  const calendarEventsMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    
    if (!allPlannedDates || !subTopics) return map;

    // Track which subtopic+date combinations we've already added to avoid duplicates
    const seenKeys = new Set<string>();

    // Add study dates first
    subTopics.forEach(subTopic => {
      const date = timeToDate(subTopic.studyDate);
      const dateKey = getDateKey(date);
      const uniqueKey = `${subTopic.id.toString()}-${dateKey}-study`;
      
      if (!seenKeys.has(uniqueKey)) {
        seenKeys.add(uniqueKey);
        
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        
        map.get(dateKey)?.push({
          subTopicId: subTopic.id,
          difficulty: subTopic.difficulty,
          date,
          type: 'study',
        });
      }
    });

    // Add planned revision dates (from backend-calculated intervals)
    allPlannedDates.forEach(item => {
      item.plannedDates.forEach(timestamp => {
        const date = timeToDate(timestamp);
        const dateKey = getDateKey(date);
        const uniqueKey = `${item.subTopicId.toString()}-${dateKey}-revision`;
        
        // Only add if we haven't seen this exact subtopic+date combination
        if (!seenKeys.has(uniqueKey)) {
          seenKeys.add(uniqueKey);
          
          if (!map.has(dateKey)) {
            map.set(dateKey, []);
          }
          
          map.get(dateKey)?.push({
            subTopicId: item.subTopicId,
            difficulty: item.difficulty,
            date,
            type: 'revision',
          });
        }
      });
    });

    return map;
  }, [allPlannedDates, subTopics]);

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateKey = getDateKey(date);
    return calendarEventsMap.get(dateKey) || [];
  };

  const getSubTopicById = (id: bigint) => {
    return subTopics?.find(st => st.id === id);
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const selectedDateIsToday = selectedDate ? isToday(selectedDate) : false;
  const selectedDateIsPast = selectedDate ? isPast(selectedDate) : false;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Revision Calendar</h2>
        <p className="text-muted-foreground mt-2">
          View all scheduled revision sessions and study dates with difficulty indicators
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={previousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }
                
                const dayEvents = getEventsForDate(date);
                const hasEvents = dayEvents.length > 0;
                const isTodayDate = isToday(date);
                const isPastDate = isPast(date);
                const isSelected = selectedDate && 
                  date.getDate() === selectedDate.getDate() &&
                  date.getMonth() === selectedDate.getMonth() &&
                  date.getFullYear() === selectedDate.getFullYear();

                const allDifficulties = dayEvents.map(e => e.difficulty);

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(date)}
                    className={`aspect-square rounded-lg border p-2 text-sm transition-colors hover:bg-accent relative ${
                      isTodayDate ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : ''
                    } ${isSelected ? 'bg-accent' : ''} ${hasEvents ? 'font-semibold' : ''} ${
                      isPastDate && hasEvents ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <span>{date.getDate()}</span>
                      {hasEvents && (
                        <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                          {allDifficulties.slice(0, 3).map((diff, i) => (
                            <div 
                              key={i} 
                              className={`h-1.5 w-1.5 rounded-full ${
                                diff === Difficulty.easy ? 'bg-green-500' :
                                diff === Difficulty.medium ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`} 
                            />
                          ))}
                          {allDifficulties.length > 3 && (
                            <span className="text-xs ml-0.5">+{allDifficulties.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>
                {selectedDate 
                  ? format(selectedDate, 'MMMM d')
                  : 'Select a date'}
              </CardTitle>
              {selectedDateIsToday && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  Today
                </Badge>
              )}
              {selectedDateIsPast && !selectedDateIsToday && (
                <Badge variant="outline" className="text-xs">Past</Badge>
              )}
            </div>
            <CardDescription>
              {selectedDateEvents.length > 0
                ? `${selectedDateEvents.length} item${selectedDateEvents.length !== 1 ? 's' : ''}`
                : 'No items'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDateEvents.length > 0 ? (
              <div className="space-y-3">
                {selectedDateEvents.map((event, idx) => {
                  const subTopic = getSubTopicById(event.subTopicId);
                  if (!subTopic) return null;
                  
                  return (
                    <div key={`${event.type}-${event.subTopicId.toString()}-${idx}`} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground mb-1">{subTopic.mainTopicTitle}</p>
                          <h4 className="font-medium">{subTopic.title}</h4>
                        </div>
                        <Badge variant="outline" className={difficultyColors[subTopic.difficulty]}>
                          {subTopic.difficulty}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{subTopic.description}</p>
                      <Badge 
                        variant="secondary" 
                        className={event.type === 'study' 
                          ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 text-xs'
                          : 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20 text-xs'
                        }
                      >
                        {event.type === 'study' ? (
                          <>
                            <CalendarIconLucide className="h-3 w-3 mr-1" />
                            Study Date
                          </>
                        ) : (
                          'Revision Session'
                        )}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                {selectedDate ? 'No items for this day' : 'Click on a date to view details'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
