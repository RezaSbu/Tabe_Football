import { motion, AnimatePresence } from "motion/react";

interface GoalNotificationProps {
  activeGoalEvent: any;
  setActiveGoalEvent: (v: any) => void;
}

export function GoalNotification({ activeGoalEvent, setActiveGoalEvent }: GoalNotificationProps) {
  return (
    <AnimatePresence>
      {activeGoalEvent && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900/95 backdrop-blur-xl border border-red-500/30 rounded-2xl p-4 shadow-2xl shadow-red-950/40 text-right"
          dir="rtl"
        >
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-red-600/10 flex items-center justify-center text-red-500 shrink-0 border border-red-500/20">
              <span className="text-lg font-bold">⚽</span>
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" />
                  خبر گل زده!
                </span>
                <span className="text-[10px] text-gray-550 font-sans font-medium">{activeGoalEvent.minute || "دقیقه زده"}</span>
              </div>

              <h4 className="text-sm font-bold text-white">
                گل برای {activeGoalEvent.scoringTeam}!
              </h4>

              <p className="text-xs text-slate-300 leading-snug">
                توسط مهاجم خلاق <span className="font-bold text-yellow-400">{activeGoalEvent.scorerName}</span> دروازه باز گردید.
              </p>

              <div className="pt-2 text-xs font-bold font-sans text-gray-305 bg-slate-950/50 px-2.5 py-1 rounded flex justify-between">
                <span>{activeGoalEvent.teamHome} {activeGoalEvent.scoreHome}</span>
                <span className="text-gray-600">-</span>
                <span>{activeGoalEvent.teamAway} {activeGoalEvent.scoreAway}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setActiveGoalEvent(null)}
              className="text-[10px] font-bold text-gray-300 hover:text-white bg-slate-800 hover:bg-slate-700/85 px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              بستن اعلان
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
