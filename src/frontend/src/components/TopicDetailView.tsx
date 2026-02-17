import { useState } from 'react';
import { useGetSubTopicsByMainTopic } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Eye } from 'lucide-react';
import { format } from 'date-fns';
import type { MainTopic, SubTopic } from '../backend';
import SubTopicScheduleView from './SubTopicScheduleView';

interface TopicDetailViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mainTopic: MainTopic | null;
}

const difficultyColors = {
  easy: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  hard: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
};

export default function TopicDetailView({ open, onOpenChange, mainTopic }: TopicDetailViewProps) {
  const { data: subTopics, isLoading: subTopicsLoading } = useGetSubTopicsByMainTopic(mainTopic?.id || null);
  const [scheduleViewOpen, setScheduleViewOpen] = useState(false);
  const [viewingSubTopic, setViewingSubTopic] = useState<SubTopic | null>(null);

  const handleViewSchedule = (subTopic: SubTopic) => {
    setViewingSubTopic(subTopic);
    setScheduleViewOpen(true);
  };

  const handleScheduleViewClose = () => {
    setScheduleViewOpen(false);
    setViewingSubTopic(null);
  };

  if (!mainTopic) return null;

  const activeSubTopics = subTopics?.filter(st => !st.completed) || [];
  const completedSubTopics = subTopics?.filter(st => st.completed) || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-2xl">{mainTopic.title}</DialogTitle>
                <DialogDescription className="mt-2">{mainTopic.description}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {subTopicsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Subtopics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {subTopics && subTopics.length > 0 ? (
                    <div className="space-y-6">
                      {activeSubTopics.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-muted-foreground">Active Subtopics</h4>
                          {activeSubTopics.map((subTopic) => {
                            const studyDate = new Date(Number(subTopic.studyDate / BigInt(1_000_000)));
                            return (
                              <div
                                key={subTopic.id.toString()}
                                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                                onClick={() => handleViewSchedule(subTopic)}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h5 className="font-semibold">{subTopic.title}</h5>
                                    <Badge variant="outline" className={difficultyColors[subTopic.difficulty]}>
                                      {subTopic.difficulty}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-1">{subTopic.description}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Study date: {format(studyDate, 'MMM d, yyyy')}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewSchedule(subTopic);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Schedule
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {completedSubTopics.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-muted-foreground">Completed Subtopics</h4>
                          {completedSubTopics.map((subTopic) => {
                            const studyDate = new Date(Number(subTopic.studyDate / BigInt(1_000_000)));
                            return (
                              <div
                                key={subTopic.id.toString()}
                                className="flex items-center justify-between p-3 rounded-lg border opacity-60 hover:bg-accent/50 transition-colors cursor-pointer"
                                onClick={() => handleViewSchedule(subTopic)}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h5 className="font-semibold">{subTopic.title}</h5>
                                    <Badge variant="outline" className={difficultyColors[subTopic.difficulty]}>
                                      {subTopic.difficulty}
                                    </Badge>
                                    <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                                      Completed
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-1">{subTopic.description}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Study date: {format(studyDate, 'MMM d, yyyy')}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewSchedule(subTopic);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Schedule
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No subtopics yet. Add subtopics to see their revision schedules.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SubTopicScheduleView
        open={scheduleViewOpen}
        onOpenChange={handleScheduleViewClose}
        subTopic={viewingSubTopic}
      />
    </>
  );
}
