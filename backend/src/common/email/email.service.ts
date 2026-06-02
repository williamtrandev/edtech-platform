import { EMAIL_PROVIDER } from "../constants/email";
import { createLogger } from "../../config/logger";
import { env } from "../../config/env";
import { resolveEmailProvider } from "./email-delivery-status";
import { sendViaSmtp } from "./email-smtp";
import { buildNotificationEmailTemplate, type NotificationEmailTemplateInput } from "./notification-email.template";

const log = createLogger("EmailService");

export type SendNotificationEmailInput = NotificationEmailTemplateInput & {
  to: string;
};

type ResendEmailResponse = {
  id?: string;
  message?: string;
};

async function sendViaResend(input: SendNotificationEmailInput, template: ReturnType<typeof buildNotificationEmailTemplate>) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [input.to],
      subject: template.subject,
      html: template.html,
      text: template.text
    })
  });

  const payload = (await response.json().catch(() => ({}))) as ResendEmailResponse;
  if (!response.ok) {
    throw new Error(payload.message ?? `RESEND_EMAIL_FAILED_${response.status}`);
  }

  return payload.id ?? null;
}

export async function sendNotificationEmail(input: SendNotificationEmailInput) {
  const template = buildNotificationEmailTemplate(input);
  const provider = resolveEmailProvider();

  if (provider === EMAIL_PROVIDER.smtp) {
    const messageId = await sendViaSmtp({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
    log.info("Notification email sent", {
      provider,
      to: input.to,
      type: input.type,
      messageId
    });
    return { provider, messageId };
  }

  if (provider === EMAIL_PROVIDER.resend) {
    const messageId = await sendViaResend(input, template);
    log.info("Notification email sent", {
      provider,
      to: input.to,
      type: input.type,
      messageId
    });
    return { provider, messageId };
  }

  log.info("Notification email logged (provider not configured)", {
    provider,
    to: input.to,
    type: input.type,
    subject: template.subject,
    previewText: template.previewText,
    actionUrl: template.actionUrl
  });

  return { provider, messageId: null };
}
