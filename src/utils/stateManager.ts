import { Firestore, Timestamp, type DocumentReference } from "@google-cloud/firestore";

export type DeviceState = {
  status: boolean;
  timestamp: Date;
};

export type FanState = DeviceState;
export type LightState = DeviceState;

const firestore = new Firestore();
const fanStateDocument = firestore.doc("fanStates/bathroom");
const lightStateDocument = firestore.doc("lightStates/bathroom");

async function readState(document: DocumentReference): Promise<DeviceState | null> {
  const snapshot = await document.get();

  if (!snapshot.exists) return null;

  const data = snapshot.data();
  if (
    typeof data?.status !== "boolean" ||
    !(data.timestamp instanceof Timestamp)
  ) {
    throw new Error(`Invalid saved state: ${document.path}`);
  }

  return {
    status: data.status,
    timestamp: data.timestamp.toDate(),
  };
}

async function writeState(document: DocumentReference, status: boolean): Promise<DeviceState> {
  const state: DeviceState = { status, timestamp: new Date() };
  await document.set(state);
  return state;
}

export async function getFanState(): Promise<FanState | null> {
  return readState(fanStateDocument);
}

export async function saveState(status: boolean): Promise<FanState> {
  return writeState(fanStateDocument, status);
}

export async function getLightState(): Promise<LightState | null> {
  return readState(lightStateDocument);
}

export async function saveLightState(status: boolean): Promise<LightState> {
  return writeState(lightStateDocument, status);
}
