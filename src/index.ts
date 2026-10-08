import express = require("express");
import { fanRouter } from "./routes/fan";
import { lightRouter } from "./routes/light";

const app = express();

app.get("/hello", (_req, res) => {
  res.send("Hello, World!");
});

app.use("/fan", fanRouter);
app.use("/light", lightRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Failed to access device state", error);
  res.status(500).json({ error: "Failed to access device state" });
});

export const bathroomFanManager = app;
