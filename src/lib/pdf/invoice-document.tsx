import "server-only";
import path from "path";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { money, dShort } from "@/lib/clickco/format";
import { invoiceBalance, invoicePaid } from "@/lib/clickco/invoices";
import type { InvoiceDTO } from "@/lib/clickco/invoices";
import type { BusinessSettings } from "@/generated/prisma/client";

// Mirrors quote-document.tsx's styling -- see that file's header comment for
// why react-pdf (not a headless browser) and why this is a separate render
// tree from the on-screen InvoiceDocumentPreview.
const INK = "#0e243f";
const MUTED = "#52667e";
const LINE = "#dbe4ee";
const WARN_BG = "#fff0cf";
const WARN_INK = "#6d4200";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: INK, fontFamily: "Helvetica" },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 28, height: 31 },
  brandName: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  brandMeta: { fontSize: 8.5, color: MUTED, marginTop: 2 },
  docTitle: { fontSize: 17, fontFamily: "Helvetica-Bold", textAlign: "right" },
  docMeta: { fontSize: 8.5, color: MUTED, textAlign: "right", marginTop: 4 },
  bill: { flexDirection: "row", gap: 24, marginBottom: 20 },
  billCol: { flex: 1 },
  billLabel: { fontSize: 8, color: MUTED, marginBottom: 2 },
  billName: { fontSize: 10.5, fontFamily: "Helvetica-Bold", marginBottom: 1 },
  billLine: { fontSize: 9.5 },
  table: { marginBottom: 16 },
  tableHeadRow: { flexDirection: "row", borderBottom: `2 solid ${INK}`, paddingBottom: 6, marginBottom: 6 },
  tableRow: { flexDirection: "row", borderBottom: `1 solid ${LINE}`, paddingVertical: 8 },
  th: { fontSize: 8, color: MUTED, fontFamily: "Helvetica-Bold" },
  tdDesc: { flex: 1 },
  tdLabel: { fontSize: 9.5 },
  tdAmount: { width: 110, fontSize: 9.5, textAlign: "right" },
  totals: { alignSelf: "flex-end", width: 220, marginBottom: 16 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  totalLabel: { fontSize: 9.5 },
  totalValue: { fontSize: 9.5 },
  grandRow: { flexDirection: "row", justifyContent: "space-between", borderTop: `2 solid ${INK}`, paddingTop: 6, marginTop: 2 },
  grandLabel: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  grandValue: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  grandLabelDue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#9c2b2b" },
  grandValueDue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#9c2b2b" },
  payHistBox: { marginBottom: 10 },
  payHistHead: { fontSize: 9.5, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  payHistRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottom: `1 solid ${LINE}` },
  payHistLabel: { fontSize: 8.5, color: MUTED },
  payHistAmount: { fontSize: 9 },
  stamp: { fontSize: 24, fontFamily: "Helvetica-Bold", color: "#1f8a4c", textAlign: "center", marginVertical: 10, letterSpacing: 4 },
  warnBox: { fontSize: 8.5, backgroundColor: WARN_BG, color: WARN_INK, padding: 8, borderRadius: 4, marginBottom: 10 },
  fine: { fontSize: 8, color: MUTED, borderTop: `1 solid ${LINE}`, paddingTop: 10 },
});

function InvoiceDocument({ invoice, settings }: { invoice: InvoiceDTO; settings: BusinessSettings | null }) {
  const logoPath = path.join(process.cwd(), "public", "brand", "logo-mark.png");
  const balance = invoiceBalance(invoice);
  const paid = invoicePaid(invoice);
  const hasBankDetails = Boolean(settings?.bankName && settings?.accountNumber);

  return (
    <Document title={`Invoice ${invoice.number}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.top}>
          <View style={styles.brandRow}>
            <Image src={logoPath} style={styles.logo} />
            <View>
              <Text style={styles.brandName}>Click & Co</Text>
              <Text style={styles.brandMeta}>{settings?.email ?? ""}</Text>
              <Text style={styles.brandMeta}>{settings?.phone ?? ""}</Text>
            </View>
          </View>
          <View>
            <Text style={styles.docTitle}>Invoice</Text>
            <Text style={styles.docMeta}>{invoice.number}</Text>
            <Text style={styles.docMeta}>Issued {dShort(invoice.issuedAt)}</Text>
            <Text style={styles.docMeta}>Due {dShort(invoice.dueDate)}</Text>
          </View>
        </View>

        <View style={styles.bill}>
          <View style={styles.billCol}>
            <Text style={styles.billLabel}>BILLED TO</Text>
            <Text style={styles.billName}>
              {invoice.contact.firstName} {invoice.contact.lastName ?? ""}
            </Text>
            {invoice.contact.company && <Text style={styles.billLine}>{invoice.contact.company}</Text>}
            {invoice.contact.email && <Text style={styles.billLine}>{invoice.contact.email}</Text>}
          </View>
          <View style={styles.billCol}>
            <Text style={styles.billLabel}>PAYMENT DETAILS</Text>
            {hasBankDetails ? (
              <>
                <Text style={styles.billName}>{settings!.bankName}</Text>
                <Text style={styles.billLine}>Account {settings!.accountNumber}</Text>
                {settings?.branchCode && <Text style={styles.billLine}>Branch {settings.branchCode}</Text>}
                <Text style={styles.billLine}>Reference {invoice.number}</Text>
              </>
            ) : (
              <Text style={[styles.billLine, { color: "#8f5700" }]}>Banking details missing.</Text>
            )}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeadRow}>
            <Text style={[styles.th, styles.tdDesc]}>Description</Text>
            <Text style={[styles.th, styles.tdAmount]}>Amount</Text>
          </View>
          <View style={styles.tableRow}>
            <View style={styles.tdDesc}>
              <Text style={styles.tdLabel}>{invoice.description}</Text>
            </View>
            <View style={styles.tdAmount}>
              <Text>{money(invoice.amount)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Invoice total</Text>
            <Text style={styles.totalValue}>{money(invoice.amount)}</Text>
          </View>
          {paid > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Paid to date</Text>
              <Text style={styles.totalValue}>-{money(paid)}</Text>
            </View>
          )}
          <View style={styles.grandRow}>
            <Text style={balance > 0 ? styles.grandLabelDue : styles.grandLabel}>{balance > 0 ? "Balance due" : "Balance"}</Text>
            <Text style={balance > 0 ? styles.grandValueDue : styles.grandValue}>{money(balance)}</Text>
          </View>
        </View>

        {invoice.payments.length > 0 && (
          <View style={styles.payHistBox}>
            <Text style={styles.payHistHead}>Payments received</Text>
            {invoice.payments.map((p) => (
              <View key={p.id} style={styles.payHistRow}>
                <Text style={styles.payHistLabel}>
                  {dShort(p.paidAt)} · {p.method}
                  {p.reference ? ` · ${p.reference}` : ""}
                </Text>
                <Text style={styles.payHistAmount}>{money(p.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {balance <= 0 && <Text style={styles.stamp}>PAID</Text>}

        <View style={styles.fine}>
          <Text>
            Please use the invoice number as your payment reference and send proof of payment to {settings?.email ?? ""}.
            {settings?.registrationNumber ? ` Reg. ${settings.registrationNumber}.` : ""}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(invoice: InvoiceDTO, settings: BusinessSettings | null): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument invoice={invoice} settings={settings} />) as Promise<Buffer>;
}
