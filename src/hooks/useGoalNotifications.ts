import { useEffect } from "react";
import { MatchItem } from "../types";
import { playGoalSound, showSystemNotification } from "./useGoalSound";

interface GoalNotificationsParams {
  activeGoalEvent: any;
  setActiveGoalEvent: (v: any) => void;
  matches: MatchItem[];
  subscribedTeams: string[];
}

export function useGoalNotifications({
  activeGoalEvent,
  setActiveGoalEvent,
  matches,
  subscribedTeams,
}: GoalNotificationsParams) {
  useEffect(() => {
    if (activeGoalEvent) {
      const timer = setTimeout(() => {
        setActiveGoalEvent(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [activeGoalEvent, setActiveGoalEvent]);

  const triggerMockGoalNotification = () => {
    const firstMatch = matches[0];
    const teamHome = firstMatch ? firstMatch.teamHome : "تیم میزبان";
    const teamAway = firstMatch ? firstMatch.teamAway : "تیم مهمان";

    const mockGoal = {
      id: `mock-${Date.now()}`,
      teamHome,
      teamAway,
      scoringTeam: teamHome,
      scorerName: "گلزن",
      scoreHome: 1,
      scoreAway: 0,
      minute: "۷۷'",
      timestamp: Date.now(),
    };
    setActiveGoalEvent(mockGoal);
    playGoalSound();
    showSystemNotification(
      `⚽ گل طلایی برای ${teamHome}!`,
      `یک گل تماشایی در دقیقه ۷۷ وارد دروازه شد! ${teamHome} ۱ - ۰ ${teamAway}`
    );
  };

  return { activeGoalEvent, setActiveGoalEvent, triggerMockGoalNotification };
}
