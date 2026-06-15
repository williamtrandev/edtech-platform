import { NOTIFICATION_TYPE } from "../constants/business";

export type NotificationEmailTemplateInput = {
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  appPublicUrl: string;
};

export type NotificationEmailTemplate = {
  subject: string;
  previewText: string;
  html: string;
  text: string;
  actionUrl: string | null;
  actionLabel: string;
};

type NotificationEmailKind = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

const templateMetaByType: Record<
  NotificationEmailKind,
  {
    subjectPrefix: string;
    actionLabel: string;
  }
> = {
  [NOTIFICATION_TYPE.enrollmentSuccess]: {
    subjectPrefix: "Enrollment confirmed",
    actionLabel: "Open course"
  },
  [NOTIFICATION_TYPE.assignmentGraded]: {
    subjectPrefix: "Assignment graded",
    actionLabel: "View feedback"
  },
  [NOTIFICATION_TYPE.certificateIssued]: {
    subjectPrefix: "Certificate issued",
    actionLabel: "View certificate"
  },
  [NOTIFICATION_TYPE.coursePublished]: {
    subjectPrefix: "Course published",
    actionLabel: "Start learning"
  },
  [NOTIFICATION_TYPE.system]: {
    subjectPrefix: "Platform update",
    actionLabel: "Open notification"
  }
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveAbsoluteUrl(appPublicUrl: string, linkUrl: string | null) {
  if (!linkUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(linkUrl)) {
    return linkUrl;
  }

  const base = appPublicUrl.replace(/\/$/, "");
  const path = linkUrl.startsWith("/") ? linkUrl : `/${linkUrl}`;
  return `${base}${path}`;
}

function resolveTemplateMeta(type: string) {
  const knownType = Object.values(NOTIFICATION_TYPE).find((value) => value === type);
  if (knownType) {
    return templateMetaByType[knownType];
  }

  return templateMetaByType[NOTIFICATION_TYPE.system];
}

export function buildNotificationEmailTemplate(input: NotificationEmailTemplateInput): NotificationEmailTemplate {
  const meta = resolveTemplateMeta(input.type);
  const safeTitle = escapeHtml(input.title);
  const safeBody = input.body ? escapeHtml(input.body) : null;
  const actionUrl = resolveAbsoluteUrl(input.appPublicUrl, input.linkUrl);
  const previewText = input.body?.trim() || input.title;
  const subject = `${meta.subjectPrefix}: ${input.title}`;

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e4e7;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 12px;">
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#71717a;">EdTech Platform</p>
                <h1 style="margin:0;font-size:24px;line-height:1.3;color:#18181b;">${safeTitle}</h1>
              </td>
            </tr>
            ${
              safeBody
                ? `<tr><td style="padding:0 28px 20px;"><p style="margin:0;font-size:15px;line-height:1.6;color:#3f3f46;">${safeBody}</p></td></tr>`
                : ""
            }
            ${
              actionUrl
                ? `<tr><td style="padding:0 28px 28px;"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 18px;border-radius:999px;">${meta.actionLabel}</a></td></tr>`
                : ""
            }
            <tr>
              <td style="padding:18px 28px 24px;border-top:1px solid #f4f4f5;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#71717a;">You received this email because email notifications are enabled for your account.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textLines = [input.title, "", input.body ?? "", actionUrl ? "" : null, actionUrl ? `${meta.actionLabel}: ${actionUrl}` : null].filter(
    (line): line is string => line !== null
  );

  return {
    subject,
    previewText,
    html,
    text: textLines.join("\n"),
    actionUrl,
    actionLabel: meta.actionLabel
  };
}
