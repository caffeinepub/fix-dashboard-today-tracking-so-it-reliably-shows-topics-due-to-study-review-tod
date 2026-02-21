import Set "mo:core/Set";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";

module {
  type Difficulty = { #easy; #medium; #hard };

  type MainTopic = {
    id : Nat;
    owner : Principal;
    title : Text;
    description : Text;
    creationDate : Int;
  };

  type SubTopic = {
    id : Nat;
    mainTopicId : Nat;
    mainTopicTitle : Text;
    owner : Principal;
    title : Text;
    description : Text;
    difficulty : Difficulty;
    creationDate : Int;
    studyDate : Int;
    lastReviewed : ?Int;
    completed : Bool;
    currentIntervalIndex : Nat;
  };

  // Old revision schedule type (without reviewCount)
  type OldRevisionSchedule = {
    subTopicId : Nat;
    owner : Principal;
    nextReview : Int;
    intervalDays : Nat;
    studyDate : Int;
    isReviewed : Bool;
  };

  // New revision schedule type (with reviewCount)
  type NewRevisionSchedule = {
    subTopicId : Nat;
    owner : Principal;
    nextReview : Int;
    intervalDays : Nat;
    studyDate : Int;
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

  type StateV1 = {
    mainTopics : Map.Map<Nat, MainTopic>;
    subTopics : Map.Map<Nat, SubTopic>;
    revisionSchedules : Map.Map<Nat, OldRevisionSchedule>;
    userSettings : Map.Map<Principal, UserSettings>;
    userProfiles : Map.Map<Principal, UserProfile>;
    nextTopicId : Nat;
  };

  type StateV2 = {
    mainTopics : Map.Map<Nat, MainTopic>;
    subTopics : Map.Map<Nat, SubTopic>;
    revisionSchedules : Map.Map<Nat, NewRevisionSchedule>;
    userSettings : Map.Map<Principal, UserSettings>;
    userProfiles : Map.Map<Principal, UserProfile>;
    nextTopicId : Nat;
  };

  public func run(stateV1 : StateV1) : StateV2 {
    let migratedSchedules = stateV1.revisionSchedules.map<Nat, OldRevisionSchedule, NewRevisionSchedule>(
      func(_id, oldSchedule) {
        {
          oldSchedule with
          reviewCount = 0;
        };
      }
    );
    {
      stateV1 with
      revisionSchedules = migratedSchedules;
    };
  };
};
