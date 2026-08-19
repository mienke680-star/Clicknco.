import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mail/mailer";

/** Sends any QUEUED EmailMessage whose scheduledAt has arrived. Call on a
 * schedule (e.g. every few minutes) with `Authorization: Bearer $CRON_SECRET`. */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await prisma.emailMessage.findMany({
    where: { status: "QUEUED", scheduledAt: { lte: new Date() } },
    take: 100,
  });

  let sent = 0;
  let failed = 0;
  for (const message of due) {
    const result = await sendMail({ to: message.toEmail, subject: message.subject, html: message.body });
    const ok = result.delivered || result.dev;
    await prisma.emailMessage.update({
      where: { id: message.id },
      data: { status: ok ? "SENT" : "FAILED", sentAt: new Date() },
    });
    if (ok) sent += 1;
    else failed += 1;
  }

  return NextResponse.json({ processed: due.length, sent, failed });
}
