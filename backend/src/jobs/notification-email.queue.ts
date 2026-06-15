import { NOTIFICATION_EMAIL_JOB } from "../common/constants/email";
import { sendNotificationEmail } from "../common/email/email.service";
import { env } from "../config/env";
import { createQueue, createWorker } from "./base.queue";

const queueName = "notification-email";

export type NotificationEmailJobPayload = {
  userId: string;
  email: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  notificationId: string | null;
};

export const notificationEmailQueue = createQueue(queueName);

export const notificationEmailWorker = createWorker(
  queueName,
  async (job) => {
    const payload = job.data as NotificationEmailJobPayload;
    if (!payload.userId || !payload.email) {
      throw new Error("NOTIFICATION_EMAIL_MISSING_TARGET");
    }

    await sendNotificationEmail({
      to: payload.email,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      linkUrl: payload.linkUrl,
      appPublicUrl: env.APP_PUBLIC_URL
    });
  },
  {
    concurrency: 5
  }
);

export const notificationEmailJobOptions = {
  attempts: NOTIFICATION_EMAIL_JOB.attempts,
  backoff: {
    type: "exponential" as const,
    delay: NOTIFICATION_EMAIL_JOB.backoffDelayMs
  },
  removeOnComplete: true,
  removeOnFail: 100
};
