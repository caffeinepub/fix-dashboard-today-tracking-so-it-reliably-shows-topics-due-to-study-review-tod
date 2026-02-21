import { useState, useMemo } from 'react';
import { useGetTopicsWithHierarchy, useGetRevisionSchedule, useDeleteMainTopic, useDeleteSubTopic, useMarkSubTopicCompleted, useMarkSubTopicPending } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Pencil, Trash2, CheckCircle2, Circle, Calendar, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { format } from 'date-fns';
import TopicDialog from './TopicDialog';
import TopicDetailView from './TopicDetailView';
import SubTopicScheduleView from './SubTopicScheduleView';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { MainTopic, SubTopic } from '../backend';

const difficultyColors = {
  easy: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  hard: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
};

export default function TopicsView() {
  const { data: topicsData, isLoading } = useGetTopicsWithHierarchy();
  const { data: revisionSchedules } = useGetRevisionSchedule();
  const deleteMainTopic = useDeleteMainTopic();
  const deleteSubTopic = useDeleteSubTopic();
  const markCompleted = useMarkSubTopicCompleted();
  const markPending = useMarkSubTopicPending();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMainTopic, setEditingMainTopic] = useState<MainTopic | null>(null);
  const [editingSubTopic, setEditingSubTopic] = useState<SubTopic | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'main' | 'sub'; id: bigint } | null>(null);
  const [detailViewOpen, setDetailViewOpen] = useState(false);
  const [viewingMainTopic, setViewingMainTopic] = useState<MainTopic | null>(null);
  const [viewingSubTopicId, setViewingSubTopicId] = useState<bigint | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  const mainTopics = topicsData?.mainTopics || [];
  const subTopics = topicsData?.subTopics || [];

  const subTopicsByMainTopic = useMemo(() => {
    const map = new Map<string, SubTopic[]>();
    subTopics.forEach(subTopic => {
      const key = subTopic.mainTopicId.toString();
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)?.push(subTopic);
    });
    return map;
  }, [subTopics]);

  const getReviewCount = (subTopicId: bigint): number => {
    const schedule = revisionSchedules?.find(s => s.subTopicId === subTopicId);
    return schedule ? Number(schedule.reviewCount) : 0;
  };

  const toggleExpanded = (mainTopicId: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(mainTopicId)) {
        next.delete(mainTopicId);
      } else {
        next.add(mainTopicId);
      }
      return next;
    });
  };

  const handleEditMainTopic = (mainTopic: MainTopic, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMainTopic(mainTopic);
    setEditingSubTopic(null);
    setDialogOpen(true);
  };

  const handleEditSubTopic = (subTopic: SubTopic, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSubTopic(subTopic);
    setEditingMainTopic(null);
    setDialogOpen(true);
  };

  const handleDeleteMainTopic = (id: bigint, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget({ type: 'main', id });
    setDeleteDialogOpen(true);
  };

  const handleDeleteSubTopic = (id: bigint, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget({ type: 'sub', id });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      if (deleteTarget.type === 'main') {
        deleteMainTopic.mutate(deleteTarget.id);
      } else {
        deleteSubTopic.mutate(deleteTarget.id);
      }
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleToggleComplete = (subTopic: SubTopic, e: React.MouseEvent) => {
    e.stopPropagation();
    if (subTopic.completed) {
      markPending.mutate(subTopic.id);
    } else {
      markCompleted.mutate(subTopic.id);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingMainTopic(null);
      setEditingSubTopic(null);
    }
  };

  const handleViewDetails = (mainTopic: MainTopic) => {
    setViewingMainTopic(mainTopic);
    setDetailViewOpen(true);
  };

  const handleDetailViewClose = () => {
    setDetailViewOpen(false);
    setViewingMainTopic(null);
  };

  const handleViewSchedule = (subTopic: SubTopic, e: React.MouseEvent) => {
    e.stopPropagation();
    setViewingSubTopicId(subTopic.id);
  };

  const handleScheduleViewClose = () => {
    setViewingSubTopicId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeMainTopics = mainTopics.filter(mt => {
    const subs = subTopicsByMainTopic.get(mt.id.toString()) || [];
    return subs.some(st => !st.completed);
  });

  const completedMainTopics = mainTopics.filter(mt => {
    const subs = subTopicsByMainTopic.get(mt.id.toString()) || [];
    return subs.length > 0 && subs.every(st => st.completed);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">All Topics</h2>
          <p className="text-muted-foreground mt-2">
            Manage your revision topics and track your progress
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Topic
        </Button>
      </div>

      {mainTopics.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium">No topics yet</p>
            <p className="text-sm text-muted-foreground mt-2">Create your first topic to get started</p>
            <Button onClick={() => setDialogOpen(true)} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Topic
            </Button>
          </CardContent>
        </Card>
      )}

      {activeMainTopics.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Active Topics</h3>
          <div className="space-y-3">
            {activeMainTopics.map((mainTopic) => {
              const subs = subTopicsByMainTopic.get(mainTopic.id.toString()) || [];
              const activeSubs = subs.filter(st => !st.completed);
              const completedSubs = subs.filter(st => st.completed);
              const isExpanded = expandedTopics.has(mainTopic.id.toString());

              return (
                <Card key={mainTopic.id.toString()} className="overflow-hidden">
                  <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(mainTopic.id.toString())}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <CollapsibleTrigger className="flex items-start gap-2 flex-1 text-left hover:opacity-80 transition-opacity">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 mt-0.5 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-5 w-5 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <CardTitle className="text-xl">{mainTopic.title}</CardTitle>
                            <CardDescription className="mt-1">{mainTopic.description}</CardDescription>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {activeSubs.length} active
                              </Badge>
                              {completedSubs.length > 0 && (
                                <Badge variant="outline" className="text-xs opacity-60">
                                  {completedSubs.length} completed
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleViewDetails(mainTopic)}
                          >
                            View All
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleEditMainTopic(mainTopic, e)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleDeleteMainTopic(mainTopic.id, e)}
                            disabled={deleteMainTopic.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-6">
                          {activeSubs.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-muted-foreground">Active Subtopics</h4>
                              {activeSubs.map((subTopic) => {
                                const studyDate = new Date(Number(subTopic.studyDate / BigInt(1_000_000)));
                                const reviewCount = getReviewCount(subTopic.id);
                                return (
                                  <div
                                    key={subTopic.id.toString()}
                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h5 className="font-semibold">{subTopic.title}</h5>
                                        <Badge variant="outline" className={difficultyColors[subTopic.difficulty]}>
                                          {subTopic.difficulty}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                          {reviewCount} reviews
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground line-clamp-1">{subTopic.description}</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Study date: {format(studyDate, 'MMM d, yyyy')}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => handleViewSchedule(subTopic, e)}
                                      >
                                        <Eye className="h-4 w-4 mr-1" />
                                        Schedule
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => handleToggleComplete(subTopic, e)}
                                        disabled={markCompleted.isPending || markPending.isPending}
                                      >
                                        {subTopic.completed ? (
                                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <Circle className="h-4 w-4" />
                                        )}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => handleEditSubTopic(subTopic, e)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => handleDeleteSubTopic(subTopic.id, e)}
                                        disabled={deleteSubTopic.isPending}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {completedSubs.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-muted-foreground">Completed Subtopics</h4>
                              {completedSubs.map((subTopic) => {
                                const studyDate = new Date(Number(subTopic.studyDate / BigInt(1_000_000)));
                                const reviewCount = getReviewCount(subTopic.id);
                                return (
                                  <div
                                    key={subTopic.id.toString()}
                                    className="flex items-center justify-between p-3 rounded-lg border opacity-60 hover:bg-accent/50 transition-colors"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h5 className="font-semibold">{subTopic.title}</h5>
                                        <Badge variant="outline" className={difficultyColors[subTopic.difficulty]}>
                                          {subTopic.difficulty}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                          {reviewCount} reviews
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground line-clamp-1">{subTopic.description}</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Study date: {format(studyDate, 'MMM d, yyyy')}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => handleViewSchedule(subTopic, e)}
                                      >
                                        <Eye className="h-4 w-4 mr-1" />
                                        Schedule
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => handleToggleComplete(subTopic, e)}
                                        disabled={markCompleted.isPending || markPending.isPending}
                                      >
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => handleEditSubTopic(subTopic, e)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => handleDeleteSubTopic(subTopic.id, e)}
                                        disabled={deleteSubTopic.isPending}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {completedMainTopics.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Completed Topics</h3>
          <div className="space-y-3">
            {completedMainTopics.map((mainTopic) => {
              const subs = subTopicsByMainTopic.get(mainTopic.id.toString()) || [];
              const isExpanded = expandedTopics.has(mainTopic.id.toString());

              return (
                <Card key={mainTopic.id.toString()} className="opacity-60 overflow-hidden">
                  <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(mainTopic.id.toString())}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <CollapsibleTrigger className="flex items-start gap-2 flex-1 text-left hover:opacity-80 transition-opacity">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 mt-0.5 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-5 w-5 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <CardTitle className="text-xl">{mainTopic.title}</CardTitle>
                            <CardDescription className="mt-1">{mainTopic.description}</CardDescription>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {subs.length} completed
                              </Badge>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleViewDetails(mainTopic)}
                          >
                            View All
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleEditMainTopic(mainTopic, e)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleDeleteMainTopic(mainTopic.id, e)}
                            disabled={deleteMainTopic.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {subs.map((subTopic) => {
                            const studyDate = new Date(Number(subTopic.studyDate / BigInt(1_000_000)));
                            const reviewCount = getReviewCount(subTopic.id);
                            return (
                              <div
                                key={subTopic.id.toString()}
                                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h5 className="font-semibold">{subTopic.title}</h5>
                                    <Badge variant="outline" className={difficultyColors[subTopic.difficulty]}>
                                      {subTopic.difficulty}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {reviewCount} reviews
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-1">{subTopic.description}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Study date: {format(studyDate, 'MMM d, yyyy')}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => handleViewSchedule(subTopic, e)}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Schedule
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => handleToggleComplete(subTopic, e)}
                                    disabled={markCompleted.isPending || markPending.isPending}
                                  >
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => handleEditSubTopic(subTopic, e)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => handleDeleteSubTopic(subTopic.id, e)}
                                    disabled={deleteSubTopic.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <TopicDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        mainTopic={editingMainTopic}
        subTopic={editingSubTopic}
      />

      {viewingMainTopic && (
        <TopicDetailView
          mainTopic={viewingMainTopic}
          open={detailViewOpen}
          onClose={handleDetailViewClose}
        />
      )}

      {viewingSubTopicId && (
        <SubTopicScheduleView
          subTopicId={viewingSubTopicId}
          onClose={handleScheduleViewClose}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'main'
                ? 'This will permanently delete the main topic and all its subtopics. This action cannot be undone.'
                : 'This will permanently delete the subtopic. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
