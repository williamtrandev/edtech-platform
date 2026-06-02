import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { env } from "../../config/env";

let transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;

function getSmtpTransporter() {
  if (!env.SMTP_HOST) {
    throw new Error("SMTP_HOST_NOT_CONFIGURED");
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? {
              user: env.SMTP_USER,
              pass: env.SMTP_PASS
            }
          : undefined
    });
  }

  return transporter;
}

export async function sendViaSmtp(message: Mail.Options) {
  const client = getSmtpTransporter();
  const result = await client.sendMail(message);
  return result.messageId ?? null;
}
