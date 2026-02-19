import Runtime "mo:core/Runtime";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import Set "mo:core/Set";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Principal "mo:core/Principal";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Migration "migration";

(with migration = Migration.run)
actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  type UUID = Nat;
  type Difficulty = { #easy; #medium; #hard };

  module DefaultIntervals {
    public let easy = [7, 21, 45, 90];
    public let medium = [3, 7, 21, 45, 90];
    public let hard = [1, 3, 7, 21, 45];
  };

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
    isReviewed : Bool;
  };

  type UserSettings = {
    easyIntervals : [Nat];
    mediumIntervals : [Nat];
    hardIntervals : [Nat];
    preferredReviewDays : Set.Set<Nat>;
  };

  public type UserProfile = {
    name : Text;
  };

  let mainTopics = Map.empty<UUID, MainTopic>();
  let subTopics = Map.empty<UUID, SubTopic>();
  let revisionSchedules = Map.empty<UUID, RevisionSchedule>();
  let userSettings = Map.empty<Principal, UserSettings>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  var nextTopicId : Nat = 0;

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  func getDefaultIntervals(difficulty : Difficulty) : [Nat] {
    switch (difficulty) {
      case (#easy) { DefaultIntervals.easy };
      case (#medium) { DefaultIntervals.medium };
      case (#hard) { DefaultIntervals.hard };
    };
  };

  public query ({ caller }) func getIntervalForDifficulty(difficulty : Difficulty) : async [Nat] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access intervals");
    };
    let custom = userSettings.get(caller);
    switch (difficulty, custom) {
      case (#easy, ?settings) { settings.easyIntervals };
      case (#medium, ?settings) { settings.mediumIntervals };
      case (#hard, ?settings) { settings.hardIntervals };
      case (_) { getDefaultIntervals(difficulty) };
    };
  };

  public shared ({ caller }) func createMainTopic(title : Text, description : Text) : async UUID {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create main topics");
    };
    let id = nextTopicId;
    nextTopicId += 1;

    let mainTopic : MainTopic = {
      id;
      owner = caller;
      title;
      description;
      creationDate = Time.now();
    };

    mainTopics.add(id, mainTopic);
    id;
  };

  public shared ({ caller }) func updateMainTopic(id : UUID, title : Text, description : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update main topics");
    };
    switch (mainTopics.get(id)) {
      case (null) { Runtime.trap("Main topic not found") };
      case (?existing) {
        if (existing.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only update your own main topics");
        };
        let updated : MainTopic = {
          existing with title;
          description;
        };
        mainTopics.add(id, updated);
      };
    };
  };

  public shared ({ caller }) func deleteMainTopic(id : UUID) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete main topics");
    };
    switch (mainTopics.get(id)) {
      case (null) { Runtime.trap("Main topic not found") };
      case (?existing) {
        if (existing.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only delete your own main topics");
        };
        mainTopics.remove(id);

        let subTopicIdsToRemove = subTopics.toArray().filter(
          func((_, subTopic)) {
            subTopic.mainTopicId == id;
          }
        ).map(func((id, _)) { id });

        for (deleteId in subTopicIdsToRemove.values()) {
          subTopics.remove(deleteId);
          revisionSchedules.remove(deleteId);
        };
      };
    };
  };

  public shared ({ caller }) func createSubTopic(
    mainTopicId : UUID,
    title : Text,
    description : Text,
    difficulty : Difficulty,
    studyDate : Time.Time,
  ) : async UUID {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create subtopics");
    };
    switch (mainTopics.get(mainTopicId)) {
      case (null) { Runtime.trap("Parent main topic not found") };
      case (?mainTopic) {
        if (mainTopic.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only create subtopics under your own main topics");
        };
        let id = nextTopicId;
        nextTopicId += 1;

        let subTopic : SubTopic = {
          id;
          mainTopicId;
          mainTopicTitle = mainTopic.title;
          owner = caller;
          title;
          description;
          difficulty;
          creationDate = Time.now();
          studyDate;
          lastReviewed = null;
          completed = false;
          currentIntervalIndex = 0;
        };

        subTopics.add(id, subTopic);

        // Schedule initial review based on the requested studyDate
        let initialDayLength = 24 * 60 * 60 * 1_000_000_000;
        let initialRevision : RevisionSchedule = {
          subTopicId = id;
          owner = caller;
          nextReview = studyDate;
          intervalDays = 0;
          studyDate;
          isReviewed = false;
        };
        revisionSchedules.add(id, initialRevision);

        id;
      };
    };
  };

  public shared ({ caller }) func updateSubTopic(
    id : UUID,
    title : Text,
    description : Text,
    difficulty : Difficulty,
    studyDate : Time.Time,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update subtopics");
    };
    switch (subTopics.get(id)) {
      case (null) { Runtime.trap("Subtopic not found") };
      case (?existing) {
        if (existing.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only update your own subtopics");
        };
        let updated : SubTopic = {
          existing with title;
          description;
          difficulty;
          studyDate;
        };
        subTopics.add(id, updated);
      };
    };
  };

  public shared ({ caller }) func deleteSubTopic(id : UUID) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete subtopics");
    };
    switch (subTopics.get(id)) {
      case (null) { Runtime.trap("Subtopic not found") };
      case (?existing) {
        if (existing.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only delete your own subtopics");
        };
        subTopics.remove(id);
        revisionSchedules.remove(id);
      };
    };
  };

  public shared ({ caller }) func markSubTopicCompleted(id : UUID) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark subtopics as completed");
    };
    switch (subTopics.get(id)) {
      case (null) { Runtime.trap("Subtopic not found") };
      case (?existing) {
        if (existing.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only mark your own subtopics as completed");
        };
        let updated : SubTopic = { existing with completed = true };
        subTopics.add(id, updated);
      };
    };
  };

  public shared ({ caller }) func markSubTopicPending(id : UUID) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark subtopics as pending");
    };
    switch (subTopics.get(id)) {
      case (null) { Runtime.trap("Subtopic not found") };
      case (?existing) {
        if (existing.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only mark your own subtopics as pending");
        };
        let updated : SubTopic = { existing with completed = false };
        subTopics.add(id, updated);
      };
    };
  };

  public query ({ caller }) func getMainTopics() : async [MainTopic] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access main topics");
    };
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    mainTopics.values().toArray().filter(
      func(topic : MainTopic) : Bool {
        isAdmin or topic.owner == caller
      }
    ).sort(
      func(t1 : MainTopic, t2 : MainTopic) : Order.Order {
        Nat.compare(t1.id, t2.id);
      }
    );
  };

  public query ({ caller }) func getSubTopics() : async [SubTopic] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access subtopics");
    };
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    subTopics.values().toArray().filter(
      func(topic : SubTopic) : Bool {
        isAdmin or topic.owner == caller
      }
    ).sort(
      func(t1 : SubTopic, t2 : SubTopic) : Order.Order {
        Nat.compare(t1.id, t2.id);
      }
    );
  };

  public query ({ caller }) func getSubTopicsByMainTopic(mainTopicId : UUID) : async [SubTopic] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access subtopics by main topic");
    };
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    subTopics.values().toArray().filter(
      func(topic : SubTopic) : Bool {
        topic.mainTopicId == mainTopicId and (isAdmin or topic.owner == caller)
      }
    );
  };

  public query ({ caller }) func getRevisionSchedule() : async [RevisionSchedule] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access revision schedules");
    };
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    revisionSchedules.values().toArray().filter(
      func(schedule : RevisionSchedule) : Bool {
        isAdmin or schedule.owner == caller
      }
    ).sort(
      func(r1 : RevisionSchedule, r2 : RevisionSchedule) : Order.Order {
        Int.compare(r1.nextReview, r2.nextReview);
      }
    );
  };

  public shared ({ caller }) func setUserSettings(
    easyIntervals : [Nat],
    mediumIntervals : [Nat],
    hardIntervals : [Nat],
    preferredDays : [Nat],
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can set user settings");
    };
    let settings : UserSettings = {
      easyIntervals;
      mediumIntervals;
      hardIntervals;
      preferredReviewDays = Set.fromIter(preferredDays.values());
    };
    userSettings.add(caller, settings);
  };

  public query ({ caller }) func getUserSettings() : async ?{
    easyIntervals : [Nat];
    mediumIntervals : [Nat];
    hardIntervals : [Nat];
    preferredReviewDays : [Nat];
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access user settings");
    };
    switch (userSettings.get(caller)) {
      case (null) { null };
      case (?settings) {
        ?{
          easyIntervals = settings.easyIntervals;
          mediumIntervals = settings.mediumIntervals;
          hardIntervals = settings.hardIntervals;
          preferredReviewDays = settings.preferredReviewDays.toArray();
        };
      };
    };
  };

  public query ({ caller }) func getTodaySubTopics() : async [SubTopic] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get today's subtopics");
    };
    let now = Time.now();
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);

    let dueTodayIds = revisionSchedules.values().toArray().filter(
      func(schedule : RevisionSchedule) : Bool {
        let isOverdue = schedule.nextReview <= now;
        let isOwner = isAdmin or schedule.owner == caller;
        isOverdue and isOwner
      }
    ).map(
      func(schedule) {
        schedule.subTopicId;
      }
    );

    let dueToday = dueTodayIds.values().map(
      func(id) {
        switch (subTopics.get(id)) {
          case (null) { null };
          case (?topic) {
            if (isAdmin or topic.owner == caller) { ?topic } else { null };
          };
        };
      }
    );

    dueToday.toArray().filterMap(func(x) { x }).sort(
      func(a, b) {
        let aSchedule = revisionSchedules.get(a.id);
        let bSchedule = revisionSchedules.get(b.id);
        let aReview = switch (aSchedule) { case (null) { a.studyDate }; case (?schedule) { schedule.nextReview } };
        let bReview = switch (bSchedule) { case (null) { b.studyDate }; case (?schedule) { schedule.nextReview } };
        Int.compare(aReview, bReview);
      }
    );
  };

  public query ({ caller }) func getSubTopicsForDate(targetDate : Time.Time) : async [SubTopic] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get subtopics for a specific date");
    };
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);

    let dueIds = revisionSchedules.values().toArray().filter(
      func(schedule : RevisionSchedule) : Bool {
        let isDue = schedule.nextReview <= targetDate;
        let isOwner = isAdmin or schedule.owner == caller;
        isDue and isOwner
      }
    ).map(
      func(schedule) {
        schedule.subTopicId;
      }
    );

    let dueTopics = dueIds.values().map(
      func(id) {
        switch (subTopics.get(id)) {
          case (null) { null };
          case (?topic) {
            if (isAdmin or topic.owner == caller) { ?topic } else { null };
          };
        };
      }
    );

    dueTopics.toArray().filterMap(func(x) { x }).sort(
      func(a, b) {
        let aSchedule = revisionSchedules.get(a.id);
        let bSchedule = revisionSchedules.get(b.id);
        let aReview = switch (aSchedule) { case (null) { a.studyDate }; case (?schedule) { schedule.nextReview } };
        let bReview = switch (bSchedule) { case (null) { b.studyDate }; case (?schedule) { schedule.nextReview } };
        Int.compare(aReview, bReview);
      }
    );
  };

  public shared ({ caller }) func updateRevisionSchedule(subTopicId : UUID) : async RevisionSchedule {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update revision schedules");
    };
    switch (subTopics.get(subTopicId)) {
      case (null) { Runtime.trap("Subtopic not found") };
      case (?subTopic) {
        if (subTopic.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only update revision schedules for your own subtopics");
        };

        let intervals = switch (userSettings.get(subTopic.owner)) {
          case (null) { getDefaultIntervals(subTopic.difficulty) };
          case (?settings) {
            switch (subTopic.difficulty) {
              case (#easy) { settings.easyIntervals };
              case (#medium) { settings.mediumIntervals };
              case (#hard) { settings.hardIntervals };
            };
          };
        };

        let currentIndex = if (subTopic.currentIntervalIndex >= intervals.size()) {
          if (intervals.size() == 0) {
            0;
          } else {
            intervals.size() - 1 : Nat;
          };
        } else { subTopic.currentIntervalIndex };

        let intervalDays = if (currentIndex >= 0 and currentIndex < intervals.size()) {
          intervals[currentIndex];
        } else { 1 };

        switch (subTopics.get(subTopicId)) {
          case (null) { Runtime.trap("Subtopic not found during update") };
          case (?_) {
            let updatedSubTopic : SubTopic = {
              subTopic with currentIntervalIndex = if (currentIndex + 1 < intervals.size()) {
                currentIndex + 1;
              } else { currentIndex };
            };
            subTopics.add(subTopicId, updatedSubTopic);
          };
        };

        let dayLength : Int = 24 * 60 * 60 * 1_000_000_000 : Nat;
        let schedule : RevisionSchedule = {
          subTopicId;
          owner = subTopic.owner;
          nextReview = Time.now() + (intervalDays : Int) * dayLength;
          intervalDays;
          studyDate = subTopic.studyDate;
          isReviewed = false;
        };
        revisionSchedules.add(subTopicId, schedule);
        schedule;
      };
    };
  };

  public shared ({ caller }) func markRevisionAsReviewed(subTopicId : UUID) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark revisions as reviewed");
    };
    switch (revisionSchedules.get(subTopicId)) {
      case (null) { Runtime.trap("Revision schedule not found") };
      case (?schedule) {
        if (schedule.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only mark your own revisions as reviewed");
        };
        let updatedSchedule : RevisionSchedule = {
          schedule with isReviewed = true;
        };
        revisionSchedules.add(subTopicId, updatedSchedule);
      };
    };
  };

  public query ({ caller }) func getDefaultIntervalDays() : async {
    easy : [Nat];
    medium : [Nat];
    hard : [Nat];
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access default intervals");
    };
    {
      easy = DefaultIntervals.easy;
      medium = DefaultIntervals.medium;
      hard = DefaultIntervals.hard;
    };
  };

  public shared ({ caller }) func scheduleNextReview(subTopicId : UUID, days : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can schedule reviews");
    };
    switch (subTopics.get(subTopicId)) {
      case (null) { Runtime.trap("Subtopic not found") };
      case (?subTopic) {
        if (subTopic.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only schedule reviews for your own subtopics");
        };
        let schedule : RevisionSchedule = {
          subTopicId;
          owner = subTopic.owner;
          nextReview = Time.now() + (days : Int) * (24 * 60 * 60 * 1_000_000_000 : Nat);
          intervalDays = days;
          studyDate = subTopic.studyDate;
          isReviewed = false;
        };
        revisionSchedules.add(subTopicId, schedule);
      };
    };
  };

  public shared ({ caller }) func updateIntervalIndex(subTopicId : UUID, newIndex : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update interval index");
    };
    switch (subTopics.get(subTopicId)) {
      case (null) { Runtime.trap("Subtopic not found") };
      case (?subTopic) {
        if (subTopic.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only update interval index for your own subtopics");
        };
        subTopics.add(subTopicId, {
          subTopic with
          currentIntervalIndex = newIndex;
        });
      };
    };
  };

  public query ({ caller }) func getPlannedRevisionDates(subTopicId : UUID) : async ?[Time.Time] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access planned revision dates");
    };
    switch (subTopics.get(subTopicId)) {
      case (null) { null };
      case (?subTopic) {
        if (subTopic.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only access planned revision dates for your own subtopics");
        };
        let intervals = switch (userSettings.get(subTopic.owner)) {
          case (null) { getDefaultIntervals(subTopic.difficulty) };
          case (?settings) {
            switch (subTopic.difficulty) {
              case (#easy) { settings.easyIntervals };
              case (#medium) { settings.mediumIntervals };
              case (#hard) { settings.hardIntervals };
            };
          };
        };
        let dayLength = 24 * 60 * 60 * 1_000_000_000;
        let plannedDates = intervals.map(
          func(days) {
            subTopic.studyDate + (days * dayLength);
          }
        );
        ?plannedDates;
      };
    };
  };

  public query ({ caller }) func getSubTopicsWithStudyDates() : async [SubTopic] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access subtopics with study dates");
    };
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);
    subTopics.values().toArray().filter(
      func(topic : SubTopic) : Bool {
        isAdmin or topic.owner == caller
      }
    ).sort(
      func(t1 : SubTopic, t2 : SubTopic) : Order.Order {
        Int.compare(t1.studyDate, t2.studyDate);
      }
    );
  };

  public query ({ caller }) func getTopicsWithHierarchy() : async {
    mainTopics : [MainTopic];
    subTopics : [SubTopic];
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access topics with hierarchy");
    };
    let isAdmin = AccessControl.isAdmin(accessControlState, caller);

    let filteredMainTopics = mainTopics.values().toArray().filter(
      func(topic : MainTopic) : Bool {
        isAdmin or topic.owner == caller
      }
    );

    let filteredSubTopics = subTopics.values().toArray().filter(
      func(subTopic : SubTopic) : Bool {
        isAdmin or subTopic.owner == caller
      }
    );
    {
      mainTopics = filteredMainTopics;
      subTopics = filteredSubTopics;
    };
  };

  public query ({ caller }) func getAllPlannedRevisionDates() : async [{
    subTopicId : UUID;
    owner : Principal;
    difficulty : Difficulty;
    plannedDates : [Time.Time];
  }] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access planned revision dates");
    };

    let isAdmin = AccessControl.isAdmin(accessControlState, caller);

    let filteredSubTopics = subTopics.values().toArray().filter(
      func(subTopic : SubTopic) : Bool {
        isAdmin or subTopic.owner == caller
      }
    );

    filteredSubTopics.map<SubTopic, {
      subTopicId : UUID;
      owner : Principal;
      difficulty : Difficulty;
      plannedDates : [Time.Time];
    }>(
      func(subTopic) {
        let intervals = switch (userSettings.get(subTopic.owner)) {
          case (null) { getDefaultIntervals(subTopic.difficulty) };
          case (?settings) {
            switch (subTopic.difficulty) {
              case (#easy) { settings.easyIntervals };
              case (#medium) { settings.mediumIntervals };
              case (#hard) { settings.hardIntervals };
            };
          };
        };

        let dayLength = 24 * 60 * 60 * 1_000_000_000;
        let plannedDates = intervals.map(
          func(days) {
            subTopic.studyDate + (days * dayLength);
          }
        );

        {
          subTopicId = subTopic.id;
          owner = subTopic.owner;
          difficulty = subTopic.difficulty;
          plannedDates;
        };
      }
    );
  };

  public type RevisionResult = {
    success : Bool;
    message : Text;
    updatedSchedule : ?RevisionSchedule;
  };

  public shared ({ caller }) func rescheduleRevisionToNextDay(subTopicId : UUID) : async RevisionResult {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can reschedule revisions");
    };

    let currentTime = Time.now();
    let dayLength : Int = 24 * 60 * 60 * 1_000_000_000 : Nat;

    switch (subTopics.get(subTopicId)) {
      case (null) {
        {
          success = false;
          message = "Subtopic not found";
          updatedSchedule = null;
        };
      };
      case (?subTopic) {
        if (subTopic.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          return {
            success = false;
            message = "Unauthorized: Can only reschedule your own subtopics";
            updatedSchedule = null;
          };
        };

        let intervals = switch (userSettings.get(caller)) {
          case (null) { getDefaultIntervals(subTopic.difficulty) };
          case (?settings) {
            switch (subTopic.difficulty) {
              case (#easy) { settings.easyIntervals };
              case (#medium) { settings.mediumIntervals };
              case (#hard) { settings.hardIntervals };
            };
          };
        };

        let newSchedule : RevisionSchedule = {
          subTopicId;
          owner = caller;
          nextReview = currentTime + (1 : Int) * dayLength;
          intervalDays = if (intervals.size() > 0) { intervals[0] } else { 0 };
          studyDate = subTopic.studyDate;
          isReviewed = false;
        };

        revisionSchedules.add(subTopicId, newSchedule);

        let updatedSubTopic : SubTopic = {
          subTopic with currentIntervalIndex = 0;
        };
        subTopics.add(subTopicId, updatedSubTopic);

        {
          success = true;
          message = "Revision rescheduled to tomorrow and future intervals recalculated";
          updatedSchedule = ?newSchedule;
        };
      };
    };
  };
};
