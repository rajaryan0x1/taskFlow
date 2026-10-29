import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  requireTLS: env.NODE_ENV === "production" && !env.SMTP_SECURE,
  ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } } : {}),
  connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000,
  disableFileAccess: true, disableUrlAccess: true,
});

export async function sendEmail(to: string, subject: string, text: string) {
  await mailer.sendMail({ from: env.MAIL_FROM, to: { address: to, name: "" }, subject, text });
}

export function accountLink(path: string, token: string) {
  const url = new URL(path, env.APP_ORIGIN);
  // Fragments are not sent to HTTP servers or in Referer headers.
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
}
