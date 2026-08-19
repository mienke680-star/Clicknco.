import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { SectionHeading } from "@/components/ui/misc";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { formatDateTime } from "@/lib/utils";
import { describeAuditAction } from "@/lib/audit-format";

export const metadata: Metadata = { title: "Activity Log" };

export default async function ActivityLogPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: true, company: true },
  });

  return (
    <div>
      <SectionHeading title="Activity Log" description="Every login, change and admin action across the whole platform." />
      {logs.length === 0 ? (
        <EmptyState title="Nothing logged yet" />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>User</TH>
              <TH>Action</TH>
              <TH>Company</TH>
              <TH>IP address</TH>
              <TH>Time</TH>
            </TR>
          </THead>
          <TBody>
            {logs.map((log) => (
              <TR key={log.id}>
                <TD>
                  <div className="flex items-center gap-2">
                    <Avatar name={log.actor?.name ?? "System"} size={26} />
                    <div>
                      <p className="font-medium text-navy-800">{log.actor?.name ?? "System"}</p>
                      {log.actor?.email && <p className="text-xs text-navy-400">{log.actor.email}</p>}
                    </div>
                  </div>
                </TD>
                <TD>{describeAuditAction(log.action)}</TD>
                <TD>{log.company?.name ?? "—"}</TD>
                <TD className="font-mono text-xs">{log.ip ?? "—"}</TD>
                <TD className="whitespace-nowrap text-sm text-navy-400">{formatDateTime(log.createdAt)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
