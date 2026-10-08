import express = require("express");
import { getFanState, saveState } from "./utils/stateManager";

const app = express();

app.get("/hello", (_req, res) => {
  res.send("Hello, World!");
});

app.get("/sensor-on", async (_req, res, next) => {
  try {
    res.json(await saveState(true));
  } catch (error) {
    next(error);
  }
});

app.get("/sensor-off", async (_req, res, next) => {
  try {
    res.json(await saveState(false));
  } catch (error) {
    next(error);
  }
});

app.get("/state", async (_req, res, next) => {
  try {
    const state = await getFanState();
    res.json(state);
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Failed to access fan state", error);
  res.status(500).json({ error: "Failed to access fan state" });
});

export const bathroomFanManager = app;
