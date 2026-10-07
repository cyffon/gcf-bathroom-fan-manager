import type { Request, Response } from "@google-cloud/functions-framework";

export function bathroomFanManager(_req: Request, res: Response): void {
  res.status(200).json({ status: "ok", message: "見えてますか？:3" });
}
