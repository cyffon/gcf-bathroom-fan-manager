import { Firestore, Timestamp } from "@google-cloud/firestore";

export type FanState = {
  status: boolean;
  timestamp: Date;
};

const firestore = new Firestore();
const stateDocument = firestore.doc("fanStates/bathroom");

export async function getFanState(): Promise<FanState | null> {
  const snapshot = await stateDocument.get();

  if (!snapshot.exists) return null;

  const data = snapshot.data();
  if (
    typeof data?.status !== "boolean" ||
    !(data.timestamp instanceof Timestamp)
  ) {
    throw new Error("Invalid saved fan state");
  }

  return {
    status: data.status,
    timestamp: data.timestamp.toDate(),
  } as FanState;
}

export async function saveState(status: boolean): Promise<FanState> {
  const state: FanState = { status, timestamp: new Date() };
  await stateDocument.set(state);
  return state;
}
