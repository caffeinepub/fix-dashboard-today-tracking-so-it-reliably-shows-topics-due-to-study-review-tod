import { useMemo } from 'react';
import { useGetPlannedRevisionDates } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Calendar } from 'lucide-react';
import { format, isBefore, isToday, isFuture } from 'date-fns';
import type { SubTopic } from '../backend';

interface SubTopicScheduleViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subTopic: SubTopic | null;
}

const difficultyColors = {
  easy: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  hard: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
};

export default function SubTopicScheduleView({ open, onOpenChange, subTopic }: SubTopicScheduleViewProps) {
  const { data: plannedDates, isLoading } = useGetPlannedRevisionDates(subTopic?.id || null);

  const studyDate = useMemo(() => {
    if (!subTopic) return null;
    return new Date(Number(subTopic.studyDate / BigInt(1_000_000)));
  }, [subTopic]);

  const revisionDates = useMemo(() => {
    if (!plannedDates || !studyDate) return [];
    
    const dates = [studyDate, ...plannedDates.map(d => new Date(Number(d / BigInt(1_000_000))))];
    return dates.map((date, index) => ({
      date,
      label: index === 0 ? 'Study Date' : `Revision ${index}`,
      isPast: isBefore(date, new Date()) && !isToday(date),
      isToday: isToday(date),
      isFuture: isFuture(date) && !isToday(date),
    }));
  }, [plannedDates, studyDate]);

  if (!subTopic) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{subTopic.title}</DialogTitle>
              <DialogDescription className="mt-2">{subTopic.description}</DialogDescription>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="outline" className={difficultyColors[subTopic.difficulty]}>
                  {subTopic.difficulty}
                </Badge>
                {subTopic.completed && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                    Completed
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  from {subTopic.mainTopicTitle}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Revision Schedule</h3>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : revisionDates.length > 0 ? (
                <div className="space-y-2">
                  {revisionDates.map((revision, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
                        revision.isPast ? 'bg-muted/50 opacity-60' : 
                        revision.isToday ? 'bg-primary/5 border-primary' : 
                        'bg-background'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${
                          revision.isPast ? 'bg-muted-foreground' :
                          revision.isToday ? 'bg-primary' :
                          'bg-blue-500'
                        }`} />
                        <div>
                          <p className="font-medium">{revision.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(revision.date, 'EEEE, MMMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {revision.isPast && (
                          <Badge variant="outline" className="text-xs">Past</Badge>
                        )}
                        {revision.isToday && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">
                            Today
                          </Badge>
                        )}
                        {revision.isFuture && (
                          <Badge variant="outline" className="text-xs">Upcoming</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No revision schedule available
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
