import { Router } from "express";
import { getFanState, saveState } from "../utils/stateManager";
import { cancelTask, scheduleTask } from "../utils/taskManager";

export const fanRouter = Router();

const SCHEDULED_TASK_NAME = "turn-off-fan";
const BASE_URL = "https://asia-northeast1-jitakusaba.cloudfunctions.net/bathroom-fan-manager";
const DELAY_MS = 60 * 60 * 3 * 1000; // 3 hours

fanRouter.get("/sensor-on", async (_req, res, next) => {
  try {
    const previousState = await getFanState();
    const previousScheduledTaskTime = previousState?.status === false ? new Date(previousState.timestamp.getTime() + DELAY_MS) : null;

    const now = new Date();

    if (previousScheduledTaskTime !== null && previousScheduledTaskTime > now) {
      await cancelTask(SCHEDULED_TASK_NAME).catch((error) => {
        console.error("Failed to cancel previous scheduled task", error);
        res.status(500).json({ error: "Failed to cancel previous scheduled task" });
      });
      await saveState(true);
      return res.json("3時間後に換気扇を自動で停止するようにスケジュールしました。");
    }

    res.json("換気扇はオンになりました。停止するスケジュールはありません。");
  } catch (error) {
    next(error);
  }
});

fanRouter.get("/sensor-off", async (_req, res, next) => {
  try {
    await saveState(false);
    scheduleTask({
      taskName: SCHEDULED_TASK_NAME,
      executeAt: new Date(Date.now() + DELAY_MS),
      url: `${BASE_URL}/fan/turn-off`,
    }).catch((error) => {
      console.error("Failed to schedule turn-off task", error);
      res.status(500).json({ error: "Failed to schedule turn-off task" });
    });
    res.json("換気扇はオフになりました。");
  } catch (error) {
    next(error);
  }
});

fanRouter.get("/state", async (_req, res, next) => {
  try {
    const state = await getFanState();
    res.json(state);
  } catch (error) {
    next(error);
  }
});
