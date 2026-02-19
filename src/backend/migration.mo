import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Set "mo:core/Set";
import Time "mo:core/Time";
import Principal "mo:core/Principal";

module {
  // Old types for migration
  type Difficulty = { #easy; #medium; #hard };

  type OldRevisionSchedule = {
    subTopicId : Nat;
    owner : Principal.Principal;
    nextReview : Time.Time;
    intervalDays : Nat;
    studyDate : Time.Time;
  };

  type OldUserSettings = {
    easyIntervals : [Nat];
    mediumIntervals : [Nat];
    hardIntervals : [Nat];
    preferredReviewDays : Set.Set<Nat>;
  };

  type OldActor = {
    mainTopics : Map.Map<Nat, {
      id : Nat;
      owner : Principal.Principal;
      title : Text;
      description : Text;
      creationDate : Time.Time;
    }>;
    subTopics : Map.Map<Nat, {
      id : Nat;
      mainTopicId : Nat;
      mainTopicTitle : Text;
      owner : Principal.Principal;
      title : Text;
      description : Text;
      difficulty : Difficulty;
      creationDate : Time.Time;
      studyDate : Time.Time;
      lastReviewed : ?Time.Time;
      completed : Bool;
      currentIntervalIndex : Nat;
    }>;
    revisionSchedules : Map.Map<Nat, OldRevisionSchedule>;
    userSettings : Map.Map<Principal.Principal, OldUserSettings>;
    userProfiles : Map.Map<Principal.Principal, {
      name : Text;
    }>;
    nextTopicId : Nat;
  };

  // New types for current actor
  type RevisionSchedule = {
    subTopicId : Nat;
    owner : Principal.Principal;
    nextReview : Time.Time;
    intervalDays : Nat;
    studyDate : Time.Time;
    isReviewed : Bool;
  };

  public type NewActor = {
    mainTopics : Map.Map<Nat, {
      id : Nat;
      owner : Principal.Principal;
      title : Text;
      description : Text;
      creationDate : Time.Time;
    }>;
    subTopics : Map.Map<Nat, {
      id : Nat;
      mainTopicId : Nat;
      mainTopicTitle : Text;
      owner : Principal.Principal;
      title : Text;
      description : Text;
      difficulty : Difficulty;
      creationDate : Time.Time;
      studyDate : Time.Time;
      lastReviewed : ?Time.Time;
      completed : Bool;
      currentIntervalIndex : Nat;
    }>;
    revisionSchedules : Map.Map<Nat, RevisionSchedule>;
    userSettings : Map.Map<Principal.Principal, OldUserSettings>;
    userProfiles : Map.Map<Principal.Principal, {
      name : Text;
    }>;
    nextTopicId : Nat;
  };

  public func run(old : OldActor) : NewActor {
    let newRevisionSchedules = old.revisionSchedules.map<Nat, OldRevisionSchedule, RevisionSchedule>(
      func(_id, oldSchedule) {
        { oldSchedule with isReviewed = false };
      }
    );
    {
      old with
      revisionSchedules = newRevisionSchedules;
    };
  };
};
