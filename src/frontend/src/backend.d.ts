import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface MainTopic {
    id: UUID;
    title: string;
    owner: Principal;
    description: string;
    creationDate: Time;
}
export type Time = bigint;
export type UUID = bigint;
export interface SubTopic {
    id: UUID;
    title: string;
    lastReviewed?: Time;
    currentIntervalIndex: bigint;
    owner: Principal;
    difficulty: Difficulty;
    completed: boolean;
    description: string;
    creationDate: Time;
    studyDate: Time;
    mainTopicTitle: string;
    mainTopicId: UUID;
}
export interface RevisionSchedule {
    owner: Principal;
    subTopicId: UUID;
    intervalDays: bigint;
    studyDate: Time;
    nextReview: Time;
}
export interface UserProfile {
    name: string;
}
export enum Difficulty {
    easy = "easy",
    hard = "hard",
    medium = "medium"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createMainTopic(title: string, description: string): Promise<UUID>;
    createSubTopic(mainTopicId: UUID, title: string, description: string, difficulty: Difficulty, studyDate: Time): Promise<UUID>;
    deleteMainTopic(id: UUID): Promise<void>;
    deleteSubTopic(id: UUID): Promise<void>;
    getAllPlannedRevisionDates(): Promise<Array<{
        plannedDates: Array<Time>;
        owner: Principal;
        difficulty: Difficulty;
        subTopicId: UUID;
    }>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDefaultIntervalDays(): Promise<{
        easy: Array<bigint>;
        hard: Array<bigint>;
        medium: Array<bigint>;
    }>;
    getIntervalForDifficulty(difficulty: Difficulty): Promise<Array<bigint>>;
    getMainTopics(): Promise<Array<MainTopic>>;
    getPlannedRevisionDates(subTopicId: UUID): Promise<Array<Time> | null>;
    getRevisionSchedule(): Promise<Array<RevisionSchedule>>;
    getSubTopics(): Promise<Array<SubTopic>>;
    getSubTopicsByMainTopic(mainTopicId: UUID): Promise<Array<SubTopic>>;
    getSubTopicsForDate(targetDate: Time): Promise<Array<SubTopic>>;
    getSubTopicsWithStudyDates(): Promise<Array<SubTopic>>;
    getTodaySubTopics(): Promise<Array<SubTopic>>;
    getTopicsWithHierarchy(): Promise<{
        subTopics: Array<SubTopic>;
        mainTopics: Array<MainTopic>;
    }>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserSettings(): Promise<{
        easyIntervals: Array<bigint>;
        mediumIntervals: Array<bigint>;
        preferredReviewDays: Array<bigint>;
        hardIntervals: Array<bigint>;
    } | null>;
    isCallerAdmin(): Promise<boolean>;
    markSubTopicCompleted(id: UUID): Promise<void>;
    markSubTopicPending(id: UUID): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    scheduleNextReview(subTopicId: UUID, days: bigint): Promise<void>;
    setUserSettings(easyIntervals: Array<bigint>, mediumIntervals: Array<bigint>, hardIntervals: Array<bigint>, preferredDays: Array<bigint>): Promise<void>;
    updateIntervalIndex(subTopicId: UUID, newIndex: bigint): Promise<void>;
    updateMainTopic(id: UUID, title: string, description: string): Promise<void>;
    updateRevisionSchedule(subTopicId: UUID): Promise<RevisionSchedule>;
    updateSubTopic(id: UUID, title: string, description: string, difficulty: Difficulty, studyDate: Time): Promise<void>;
}
