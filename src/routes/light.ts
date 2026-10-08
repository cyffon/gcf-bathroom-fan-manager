import { Router } from "express";
import { getLightState, saveLightState } from "../utils/stateManager";

export const lightRouter = Router();

lightRouter.get("/trigger-on", async (_req, res, next) => {
  try {
    res.json(await saveLightState(true));
  } catch (error) {
    next(error);
  }
});

lightRouter.get("/trigger-off", async (_req, res, next) => {
  try {
    res.json(await saveLightState(false));
  } catch (error) {
    next(error);
  }
});

lightRouter.get("/state", async (_req, res, next) => {
  try {
    res.json(await getLightState());
  } catch (error) {
    next(error);
  }
});
