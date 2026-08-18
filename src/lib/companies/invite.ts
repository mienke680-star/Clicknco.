// Note: no "server-only" guard — see src/lib/companies/provision.ts for why
// (this is safe to import from prisma/seed.ts too, though it isn't today).
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/crypto";
import { sendMail } from "@/lib/mail/mailer";
import { teamInviteTemplate, genericNotificationTemplate } from "@/lib/mail/templates";
import { notify } from "@/lib/notify";
import type { CompanyRole } from "@/generated/prisma/client";

export interface InviteMemberInput {
  companyId: string;
  companyName: string;
  name: string;
  email: string;
  role: CompanyRole;
  staffRoleId?: string | null;
  invitedByUserId: string;
  invitedByName: string;
}

export interface InviteMemberResult {
  membershipId: string;
  userId: string;
  createdNewUser: boolean;
  status: "INVITED" | "ACTIVE";
}

/**
 * Adds a person to a company. Two distinct paths, chosen by whether the
 * email already has a Click & Co account:
 *  - Brand new email: creates the User with an unusable placeholder
 *    password and an INVITED membership, and emails them an accept-invite
 *    link to set their real password.
 *  - Existing account: just adds an ACTIVE membership and emails a plain
 *    notice. Their existing password is never touched — accept-invite's
 *    "set your password" flow assumes a first-time user, so re-running it
 *    against an existing account would clobber a working password.
 */
export async function inviteMember(input: InviteMemberInput): Promise<InviteMemberResult> {
  const email = input.email.trim().toLowerCase();
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    const existingMembership = await prisma.membership.findUnique({
      where: { userId_companyId: { userId: existingUser.id, companyId: input.companyId } },
    });
    if (existingMembership) throw new Error("This person is already a member of this company.");

    const membership = await prisma.membership.create({
      data: {
        userId: existingUser.id,
        companyId: input.companyId,
        role: input.role,
        staffRoleId: input.staffRoleId || null,
        status: "ACTIVE",
        invitedByUserId: input.invitedByUserId,
        invitedAt: new Date(),
      },
    });

    await notify({
      companyId: input.companyId,
      userId: existingUser.id,
      type: "TEAM_INVITE",
      title: `You were added to ${input.companyName}`,
      link: "/portal",
    });
    const tpl = genericNotificationTemplate(
      `You've been added to ${input.companyName}`,
      `${input.invitedByName} added your existing Click & Co account to ${input.companyName}. Switch into it any time from your company switcher.`,
      "Open Click & Co",
      `${appUrl}/login`,
    );
    await sendMail({ to: email, subject: tpl.subject, html: tpl.html });

    return { membershipId: membership.id, userId: existingUser.id, createdNewUser: false, status: "ACTIVE" };
  }

  const placeholderHash = await hashPassword(crypto.randomBytes(32).toString("hex"));
  const { token, hash } = generateToken();

  const user = await prisma.user.create({
    data: { email, name: input.name.trim(), passwordHash: placeholderHash },
  });
  const membership = await prisma.membership.create({
    data: {
      userId: user.id,
      companyId: input.companyId,
      role: input.role,
      staffRoleId: input.staffRoleId || null,
      status: "INVITED",
      invitedByUserId: input.invitedByUserId,
      invitedAt: new Date(),
      inviteTokenHash: hash,
    },
  });

  const tpl = teamInviteTemplate(input.companyName, input.invitedByName, token);
  await sendMail({ to: email, subject: tpl.subject, html: tpl.html });

  return { membershipId: membership.id, userId: user.id, createdNewUser: true, status: "INVITED" };
}
