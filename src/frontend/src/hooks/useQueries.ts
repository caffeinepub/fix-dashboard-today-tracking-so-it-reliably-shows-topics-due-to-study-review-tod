import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { toast } from 'sonner';
import type { MainTopic, SubTopic, RevisionSchedule, UserProfile, Difficulty, Time, UUID } from '../backend';

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      toast.success('Profile saved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save profile: ${error.message}`);
    },
  });
}

export function useGetTopicsWithHierarchy() {
  const { actor, isFetching } = useActor();

  return useQuery<{ mainTopics: MainTopic[]; subTopics: SubTopic[] }>({
    queryKey: ['topicsWithHierarchy'],
    queryFn: async () => {
      if (!actor) return { mainTopics: [], subTopics: [] };
      return actor.getTopicsWithHierarchy();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMainTopics() {
  const { actor, isFetching } = useActor();

  return useQuery<MainTopic[]>({
    queryKey: ['mainTopics'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMainTopics();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetSubTopics() {
  const { actor, isFetching } = useActor();

  return useQuery<SubTopic[]>({
    queryKey: ['subTopics'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSubTopics();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetSubTopicsByMainTopic(mainTopicId: UUID | null) {
  const { actor, isFetching } = useActor();

  return useQuery<SubTopic[]>({
    queryKey: ['subTopicsByMainTopic', mainTopicId?.toString()],
    queryFn: async () => {
      if (!actor || !mainTopicId) return [];
      return actor.getSubTopicsByMainTopic(mainTopicId);
    },
    enabled: !!actor && !isFetching && mainTopicId !== null,
  });
}

export function useGetTodaySubTopics() {
  const { actor, isFetching } = useActor();

  return useQuery<SubTopic[]>({
    queryKey: ['todaySubTopics'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTodaySubTopics();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetSubTopicsForDate(targetDate: Time) {
  const { actor, isFetching } = useActor();

  return useQuery<SubTopic[]>({
    queryKey: ['subTopicsForDate', targetDate.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSubTopicsForDate(targetDate);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetRevisionSchedule() {
  const { actor, isFetching } = useActor();

  return useQuery<RevisionSchedule[]>({
    queryKey: ['revisionSchedule'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getRevisionSchedule();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetAllPlannedRevisionDates() {
  const { actor, isFetching } = useActor();

  return useQuery<Array<{
    subTopicId: UUID;
    owner: string;
    difficulty: Difficulty;
    plannedDates: Time[];
  }>>({
    queryKey: ['allPlannedRevisionDates'],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getAllPlannedRevisionDates();
      return result.map(item => ({
        ...item,
        owner: item.owner.toString(),
      }));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetUserSettings() {
  const { actor, isFetching } = useActor();

  return useQuery<{
    easyIntervals: bigint[];
    mediumIntervals: bigint[];
    hardIntervals: bigint[];
    preferredReviewDays: bigint[];
  } | null>({
    queryKey: ['userSettings'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getUserSettings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetDefaultIntervals() {
  const { actor, isFetching } = useActor();

  return useQuery<{
    easy: bigint[];
    medium: bigint[];
    hard: bigint[];
  }>({
    queryKey: ['defaultIntervals'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getDefaultIntervalDays();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetPlannedRevisionDates(subTopicId: bigint | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Time[] | null>({
    queryKey: ['plannedRevisionDates', subTopicId?.toString()],
    queryFn: async () => {
      if (!actor || !subTopicId) return null;
      return actor.getPlannedRevisionDates(subTopicId);
    },
    enabled: !!actor && !isFetching && subTopicId !== null,
  });
}

export function useCreateMainTopic() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, description }: { title: string; description: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createMainTopic(title, description);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mainTopics'] });
      queryClient.invalidateQueries({ queryKey: ['topicsWithHierarchy'] });
      toast.success('Main topic created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create main topic: ${error.message}`);
    },
  });
}

export function useUpdateMainTopic() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, title, description }: { id: bigint; title: string; description: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateMainTopic(id, title, description);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mainTopics'] });
      queryClient.invalidateQueries({ queryKey: ['topicsWithHierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['subTopics'] });
      toast.success('Main topic updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update main topic: ${error.message}`);
    },
  });
}

export function useDeleteMainTopic() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteMainTopic(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mainTopics'] });
      queryClient.invalidateQueries({ queryKey: ['topicsWithHierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['subTopics'] });
      queryClient.invalidateQueries({ queryKey: ['todaySubTopics'] });
      queryClient.invalidateQueries({ queryKey: ['subTopicsForDate'] });
      queryClient.invalidateQueries({ queryKey: ['revisionSchedule'] });
      queryClient.invalidateQueries({ queryKey: ['plannedRevisionDates'] });
      queryClient.invalidateQueries({ queryKey: ['allPlannedRevisionDates'] });
      toast.success('Main topic and all subtopics deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete main topic: ${error.message}`);
    },
  });
}

export function useCreateSubTopic() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      mainTopicId, 
      title, 
      description, 
      difficulty, 
      studyDate 
    }: { 
      mainTopicId: bigint; 
      title: string; 
      description: string; 
      difficulty: Difficulty; 
      studyDate: Time 
    }) => {
      if (!actor) throw new Error('Actor not available');
      const subTopicId = await actor.createSubTopic(mainTopicId, title, description, difficulty, studyDate);
      await actor.updateRevisionSchedule(subTopicId);
      return subTopicId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subTopics'] });
      queryClient.invalidateQueries({ queryKey: ['topicsWithHierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['todaySubTopics'] });
      queryClient.invalidateQueries({ queryKey: ['subTopicsForDate'] });
      queryClient.invalidateQueries({ queryKey: ['revisionSchedule'] });
      queryClient.invalidateQueries({ queryKey: ['allPlannedRevisionDates'] });
      toast.success('Subtopic created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create subtopic: ${error.message}`);
    },
  });
}

export function useUpdateSubTopic() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      title, 
      description, 
      difficulty, 
      studyDate 
    }: { 
      id: bigint; 
      title: string; 
      description: string; 
      difficulty: Difficulty; 
      studyDate: Time 
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateSubTopic(id, title, description, difficulty, studyDate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subTopics'] });
      queryClient.invalidateQueries({ queryKey: ['topicsWithHierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['todaySubTopics'] });
      queryClient.invalidateQueries({ queryKey: ['subTopicsForDate'] });
      queryClient.invalidateQueries({ queryKey: ['revisionSchedule'] });
      queryClient.invalidateQueries({ queryKey: ['plannedRevisionDates'] });
      queryClient.invalidateQueries({ queryKey: ['allPlannedRevisionDates'] });
      toast.success('Subtopic updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update subtopic: ${error.message}`);
    },
  });
}

export function useDeleteSubTopic() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteSubTopic(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subTopics'] });
      queryClient.invalidateQueries({ queryKey: ['topicsWithHierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['todaySubTopics'] });
      queryClient.invalidateQueries({ queryKey: ['subTopicsForDate'] });
      queryClient.invalidateQueries({ queryKey: ['revisionSchedule'] });
      queryClient.invalidateQueries({ queryKey: ['plannedRevisionDates'] });
      queryClient.invalidateQueries({ queryKey: ['allPlannedRevisionDates'] });
      toast.success('Subtopic deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete subtopic: ${error.message}`);
    },
  });
}

export function useMarkSubTopicCompleted() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.markSubTopicCompleted(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subTopics'] });
      queryClient.invalidateQueries({ queryKey: ['topicsWithHierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['todaySubTopics'] });
      queryClient.invalidateQueries({ queryKey: ['subTopicsForDate'] });
      toast.success('Subtopic marked as completed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark subtopic as completed: ${error.message}`);
    },
  });
}

export function useMarkSubTopicPending() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.markSubTopicPending(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subTopics'] });
      queryClient.invalidateQueries({ queryKey: ['topicsWithHierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['todaySubTopics'] });
      queryClient.invalidateQueries({ queryKey: ['subTopicsForDate'] });
      toast.success('Subtopic marked as pending');
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark subtopic as pending: ${error.message}`);
    },
  });
}

export function useUpdateRevisionSchedule() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateRevisionSchedule(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revisionSchedule'] });
      queryClient.invalidateQueries({ queryKey: ['todaySubTopics'] });
      queryClient.invalidateQueries({ queryKey: ['subTopicsForDate'] });
      queryClient.invalidateQueries({ queryKey: ['subTopics'] });
      queryClient.invalidateQueries({ queryKey: ['topicsWithHierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['allPlannedRevisionDates'] });
      toast.success('Review completed! Next review scheduled');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update schedule: ${error.message}`);
    },
  });
}

export function useSetUserSettings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ easyIntervals, mediumIntervals, hardIntervals, preferredDays }: { 
      easyIntervals: bigint[]; 
      mediumIntervals: bigint[]; 
      hardIntervals: bigint[]; 
      preferredDays: bigint[] 
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setUserSettings(easyIntervals, mediumIntervals, hardIntervals, preferredDays);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      queryClient.invalidateQueries({ queryKey: ['revisionSchedule'] });
      queryClient.invalidateQueries({ queryKey: ['plannedRevisionDates'] });
      queryClient.invalidateQueries({ queryKey: ['allPlannedRevisionDates'] });
      toast.success('Settings saved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });
}
