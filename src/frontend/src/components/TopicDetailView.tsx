import { useMemo } from 'react';
import { useGetSubTopicsByMainTopic, useGetRevisionSchedule } from '../hooks/useQueries';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, Circle } from 'lucide-react';
import { format } from 'date-fns';
import type { MainTopic } from '../backend';
import SubTopicScheduleView from './SubTopicScheduleView';
import { useState } from 'react';

const difficultyColors = {
  easy: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  hard: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
};

interface TopicDetailViewProps {
  mainTopic: MainTopic;
  open: boolean;
  onClose: () => void;
}

export default function TopicDetailView({ mainTopic, open, onClose }: TopicDetailViewProps) {
  const { data: subTopics, isLoading } = useGetSubTopicsByMainTopic(mainTopic.id);
  const { data: revisionSchedules } = useGetRevisionSchedule();
  const [selectedSubTopicId, setSelectedSubTopicId] = useState<bigint | null>(null);

  const { activeSubTopics, completedSubTopics } = useMemo(() => {
    if (!subTopics) return { activeSubTopics: [], completedSubTopics: [] };
    
    return {
      activeSubTopics: subTopics.filter(st => !st.completed),
      completedSubTopics: subTopics.filter(st => st.completed),
    };
  }, [subTopics]);

  const getReviewCount = (subTopicId: bigint): number => {
    const schedule = revisionSchedules?.find(s => s.subTopicId === subTopicId);
    return schedule ? Number(schedule.reviewCount) : 0;
  };

  const handleSubTopicClick = (subTopicId: bigint) => {
    setSelectedSubTopicId(subTopicId);
  };

  const handleCloseScheduleView = () => {
    setSelectedSubTopicId(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mainTopic.title}</DialogTitle>
            <DialogDescription>{mainTopic.description}</DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {activeSubTopics.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Active Subtopics</h3>
                  <div className="space-y-2">
                    {activeSubTopics.map((subTopic) => {
                      const studyDate = new Date(Number(subTopic.studyDate / BigInt(1_000_000)));
                      const reviewCount = getReviewCount(subTopic.id);
                      return (
                        <button
                          key={subTopic.id.toString()}
                          onClick={() => handleSubTopicClick(subTopic.id)}
                          className="w-full text-left p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Circle className="h-4 w-4 flex-shrink-0" />
                                <h4 className="font-semibold">{subTopic.title}</h4>
                                <Badge variant="outline" className={difficultyColors[subTopic.difficulty]}>
                                  {subTopic.difficulty}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {reviewCount} reviews
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">{subTopic.description}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Study date: {format(studyDate, 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {completedSubTopics.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Completed Subtopics</h3>
                  <div className="space-y-2">
                    {completedSubTopics.map((subTopic) => {
                      const studyDate = new Date(Number(subTopic.studyDate / BigInt(1_000_000)));
                      const reviewCount = getReviewCount(subTopic.id);
                      return (
                        <button
                          key={subTopic.id.toString()}
                          onClick={() => handleSubTopicClick(subTopic.id)}
                          className="w-full text-left p-4 rounded-lg border opacity-60 hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                <h4 className="font-semibold">{subTopic.title}</h4>
                                <Badge variant="outline" className={difficultyColors[subTopic.difficulty]}>
                                  {subTopic.difficulty}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {reviewCount} reviews
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">{subTopic.description}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Study date: {format(studyDate, 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeSubTopics.length === 0 && completedSubTopics.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No subtopics found for this topic</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedSubTopicId && (
        <SubTopicScheduleView
          subTopicId={selectedSubTopicId}
          onClose={handleCloseScheduleView}
        />
      )}
    </>
  );
}
