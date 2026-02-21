import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Set "mo:core/Set";
import Principal "mo:core/Principal";
import Time "mo:core/Time";

module {
  // Unchanged types from legacy code
  type UUID = Nat;
  type Difficulty = { #easy; #medium; #hard };

  type MainTopic = {
    id : UUID;
    owner : Principal;
    title : Text;
    description : Text;
    creationDate : Time.Time;
  };

  type SubTopic = {
    id : UUID;
    mainTopicId : UUID;
    mainTopicTitle : Text;
    owner : Principal;
    title : Text;
    description : Text;
    difficulty : Difficulty;
    creationDate : Time.Time;
    studyDate : Time.Time;
    lastReviewed : ?Time.Time;
    completed : Bool;
    currentIntervalIndex : Nat;
  };

  type RevisionSchedule = {
    subTopicId : UUID;
    owner : Principal;
    nextReview : Time.Time;
    intervalDays : Nat;
    studyDate : Time.Time;
    reviewStatuses : [Bool];
    isReviewed : Bool;
    reviewCount : Nat;
  };

  type UserSettings = {
    easyIntervals : [Nat];
    mediumIntervals : [Nat];
    hardIntervals : [Nat];
    preferredReviewDays : Set.Set<Nat>;
  };

  type UserProfile = {
    name : Text;
  };

  type OldActor = {
    mainTopics : Map.Map<UUID, MainTopic>;
    subTopics : Map.Map<UUID, SubTopic>;
    revisionSchedules : Map.Map<UUID, RevisionSchedule>;
    userSettings : Map.Map<Principal, UserSettings>;
    userProfiles : Map.Map<Principal, UserProfile>;
    nextTopicId : Nat;
  };

  // Migration is used as identity and triggers action.
  // No type changes need. The code does not
  public func run(old : OldActor) : OldActor {
    old;
  };
};
