"use client";

import { useCallback, useEffect, useState } from "react";
import { Inbox } from "lucide-react";
import { Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD, EmptyState } from "@/components/ui/table";
import { PageSpinner } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { apiFetch, apiPatch, ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";

type Status = "NEW" | "CONTACTED" | "CONVERTED" | "CLOSED";

interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string | null;
  status: Status;
  createdAt: string;
}

const STATUS_BADGE: Record<Status, "neutral" | "warning" | "success" | "danger"> = {
  NEW: "warning",
  CONTACTED: "neutral",
  CONVERTED: "success",
  CLOSED: "danger",
};

export function InquiriesClient() {
  const { toast } = useToast();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"All" | Status>("All");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter === "All" ? "" : `?status=${filter}`;
      const res = await apiFetch<{ inquiries: Inquiry[] }>(`/api/admin/inquiries${params}`);
      setInquiries(res.inquiries);
    } catch {
      toast({ title: "Couldn't load inquiries", variant: "error" });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    const handle = setTimeout(load, 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function setStatus(inquiry: Inquiry, status: Status) {
    setBusyId(inquiry.id);
    try {
      await apiPatch(`/api/admin/inquiries/${inquiry.id}`, { status });
      setInquiries((prev) => prev.map((i) => (i.id === inquiry.id ? { ...i, status } : i)));
    } catch (err) {
      toast({ title: "Couldn't update status", description: err instanceof ApiError ? err.message : undefined, variant: "error" });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["All", "NEW", "CONTACTED", "CONVERTED", "CLOSED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === s ? "border-navy-900 bg-navy-900 text-white" : "border-navy-200 text-navy-600 hover:bg-navy-50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <PageSpinner />
      ) : inquiries.length === 0 ? (
        <EmptyState icon={<Inbox className="h-10 w-10" />} title="No inquiries yet" description="Submissions from the public site's contact form will appear here." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Contact</TH>
              <TH>Message</TH>
              <TH>Status</TH>
              <TH>Received</TH>
            </TR>
          </THead>
          <TBody>
            {inquiries.map((i) => (
              <TR key={i.id}>
                <TD>
                  <p className="font-medium text-navy-900">{i.name}</p>
                  {i.company && <p className="text-xs text-navy-400">{i.company}</p>}
                </TD>
                <TD>
                  <p>{i.email}</p>
                  {i.phone && <p className="text-xs text-navy-400">{i.phone}</p>}
                </TD>
                <TD className="max-w-xs">
                  <p className="line-clamp-2 text-navy-600">{i.message || <span className="text-navy-300">—</span>}</p>
                </TD>
                <TD>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_BADGE[i.status]}>{i.status}</Badge>
                    <Select
                      value={i.status}
                      disabled={busyId === i.id}
                      onChange={(e) => setStatus(i, e.target.value as Status)}
                      className="h-8 w-32 text-xs"
                    >
                      <option value="NEW">New</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="CONVERTED">Converted</option>
                      <option value="CLOSED">Closed</option>
                    </Select>
                  </div>
                </TD>
                <TD>{formatDateTime(i.createdAt)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
