import { EMAIL_PROVIDER, type EmailProvider } from "../constants/email";
import { env } from "../../config/env";

export type EmailDeliveryStatus = {
  configuredProvider: EmailProvider;
  requestedProvider: EmailProvider;
  deliversEmail: boolean;
  emailFrom: string;
  appPublicUrl: string;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    hasCredentials: boolean;
  } | null;
  resend: {
    configured: boolean;
  };
};

export function resolveEmailProvider(): EmailProvider {
  if (env.EMAIL_PROVIDER === EMAIL_PROVIDER.smtp && env.SMTP_HOST) {
    return EMAIL_PROVIDER.smtp;
  }

  if (env.EMAIL_PROVIDER === EMAIL_PROVIDER.resend && env.RESEND_API_KEY) {
    return EMAIL_PROVIDER.resend;
  }

  return EMAIL_PROVIDER.log;
}

export function getEmailDeliveryStatus(): EmailDeliveryStatus {
  const configuredProvider = resolveEmailProvider();
  const requestedProvider = env.EMAIL_PROVIDER;

  return {
    configuredProvider,
    requestedProvider,
    deliversEmail: configuredProvider !== EMAIL_PROVIDER.log,
    emailFrom: env.EMAIL_FROM,
    appPublicUrl: env.APP_PUBLIC_URL,
    smtp:
      env.SMTP_HOST != null
        ? {
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_SECURE,
            hasCredentials: Boolean(env.SMTP_USER && env.SMTP_PASS)
          }
        : null,
    resend: {
      configured: Boolean(env.RESEND_API_KEY)
    }
  };
}
