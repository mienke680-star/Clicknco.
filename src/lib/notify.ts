import "server-only";
import { prisma } from "@/lib/db";
import type { NotificationType } from "@/generated/prisma/client";

export interface NotifyInput {
  companyId: string;
  userId?: string | null; // null = visible to all members of the company
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

/** Creates an in-app notification. Never throws into the caller's request. */
export async function notify(input: NotifyInput) {
  try {
    await prisma.notification.create({
      data: {
        companyId: input.companyId,
        userId: input.userId ?? null,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
      },
    });
  } catch (err) {
    console.error("Failed to create notification", input.type, err);
  }
}
