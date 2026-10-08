import { CloudTasksClient } from "@google-cloud/tasks";
import { randomUUID } from "node:crypto";

const tasksClient = new CloudTasksClient();

export type ScheduleTaskOptions = {
  /** Logical name. A UUID is prefixed so the same name can be scheduled again. */
  taskName: string;
  executeAt: Date;
  /** HTTPS endpoint that receives a POST request at executeAt. */
  url: string;
  payload?: Record<string, unknown>;
  /** Base URL accepted by the target's IAM authentication. Defaults to url. */
  audience?: string;
};

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

/**
 * Schedule an authenticated HTTP POST and return its full Cloud Tasks name.
 *
 * Required environment variables:
 * CLOUD_TASKS_LOCATION, CLOUD_TASKS_QUEUE, CLOUD_TASKS_SERVICE_ACCOUNT.
 * Project ID is resolved from Application Default Credentials or
 * GOOGLE_CLOUD_PROJECT. Authentication uses Application Default Credentials.
 *
 * Save the returned name to Firestore and pass it to cancelTask when needed.
 * Cloud Tasks invokes a URL; it cannot serialize a JavaScript callback.
 */
export async function scheduleTask({
  taskName,
  executeAt,
  url,
  payload = {},
  audience = url,
}: ScheduleTaskOptions): Promise<string> {
  // Cloud Tasks IDs allow at most 500 characters, including the UUID prefix.
  if (!/^[A-Za-z0-9_-]{1,463}$/.test(taskName)) {
    throw new Error("taskName must contain 1-463 letters, numbers, hyphens, or underscores");
  }

  const executeAtMs = executeAt.getTime();
  const now = Date.now();
  if (!Number.isFinite(executeAtMs) || executeAtMs <= now) {
    throw new Error("executeAt must be a valid future Date");
  }
  if (executeAtMs - now > 30 * 24 * 60 * 60 * 1000) {
    throw new Error("executeAt must be within 30 days");
  }
  if (new URL(url).protocol !== "https:") {
    throw new Error("url must use HTTPS");
  }

  const body = Buffer.from(JSON.stringify(payload));
  const location = requireEnvironmentVariable("CLOUD_TASKS_LOCATION");
  const queue = requireEnvironmentVariable("CLOUD_TASKS_QUEUE");
  const serviceAccountEmail = requireEnvironmentVariable("CLOUD_TASKS_SERVICE_ACCOUNT");
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || await tasksClient.getProjectId();
  const name = tasksClient.taskPath(
    projectId,
    location,
    queue,
    `${randomUUID()}-${taskName}`,
  );

  await tasksClient.createTask({
    parent: tasksClient.queuePath(projectId, location, queue),
    task: {
      name,
      scheduleTime: {
        seconds: Math.floor(executeAtMs / 1000),
        nanos: (executeAtMs % 1000) * 1_000_000,
      },
      httpRequest: {
        httpMethod: "POST",
        url,
        headers: { "Content-Type": "application/json" },
        body,
        oidcToken: { serviceAccountEmail, audience },
      },
    },
  });

  return name;
}

/**
 * Cancel using the full name returned by scheduleTask.
 * Returns false when the task was already deleted or finished.
 * Deletion does not stop a handler that has already started running.
 */
export async function cancelTask(taskName: string): Promise<boolean> {
  if (!/^projects\/[^/]+\/locations\/[^/]+\/queues\/[^/]+\/tasks\/[^/]+$/.test(taskName)) {
    throw new Error("taskName must be the full name returned by scheduleTask");
  }

  try {
    await tasksClient.deleteTask({ name: taskName });
    return true;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 5) {
      return false;
    }
    throw error;
  }
}

