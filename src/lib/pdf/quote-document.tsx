import "server-only";
import path from "path";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { money, dShort } from "@/lib/clickco/format";
import type { QuoteDTO } from "@/lib/clickco/quotes";
import type { BusinessSettings } from "@/generated/prisma/client";

// A separate render tree from the on-screen hub.css preview (see QuoteDocumentPreview) --
// @react-pdf/renderer has its own flexbox-only primitives and can't reuse DOM/CSS, so the
// two are kept in visual sync by hand rather than sharing markup. Chosen over a headless
// browser specifically to avoid reintroducing the native-binary/cold-start class of problem
// this project's Netlify deploy already had to work through once.
const INK = "#0e243f";
const MUTED = "#52667e";
const LINE = "#dbe4ee";

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
  tdSub: { fontSize: 8, color: MUTED, marginTop: 2 },
  tdAmount: { width: 110, fontSize: 9.5, textAlign: "right" },
  tdAmountSub: { fontSize: 8, color: MUTED, textAlign: "right", marginTop: 2 },
  totals: { alignSelf: "flex-end", width: 220, marginBottom: 16 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  totalLabel: { fontSize: 9.5 },
  totalValue: { fontSize: 9.5 },
  grandRow: { flexDirection: "row", justifyContent: "space-between", borderTop: `2 solid ${INK}`, paddingTop: 6, marginTop: 2 },
  grandLabel: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  grandValue: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  notesBox: { fontSize: 9, borderTop: `1 solid ${LINE}`, paddingTop: 10, marginBottom: 10 },
  warnBox: { fontSize: 8.5, backgroundColor: "#fff0cf", color: "#6d4200", padding: 8, borderRadius: 4, marginBottom: 10 },
  fine: { fontSize: 8, color: MUTED, borderTop: `1 solid ${LINE}`, paddingTop: 10 },
});

function QuoteDocument({ quote, settings }: { quote: QuoteDTO; settings: BusinessSettings | null }) {
  const logoPath = path.join(process.cwd(), "public", "brand", "logo-mark.png");
  const vat = settings?.vatTreatment ?? "UNSET";

  return (
    <Document title={`Quote ${quote.number}`}>
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
            <Text style={styles.docTitle}>Quotation</Text>
            <Text style={styles.docMeta}>{quote.number}</Text>
            <Text style={styles.docMeta}>Issued {dShort(quote.issuedAt)}</Text>
            <Text style={styles.docMeta}>Valid until {dShort(quote.validUntil)}</Text>
          </View>
        </View>

        <View style={styles.bill}>
          <View style={styles.billCol}>
            <Text style={styles.billLabel}>PREPARED FOR</Text>
            <Text style={styles.billName}>
              {quote.contact.firstName} {quote.contact.lastName ?? ""}
            </Text>
            {quote.contact.company && <Text style={styles.billLine}>{quote.contact.company}</Text>}
            {quote.contact.email && <Text style={styles.billLine}>{quote.contact.email}</Text>}
          </View>
          <View style={styles.billCol}>
            <Text style={styles.billLabel}>PREPARED BY</Text>
            <Text style={styles.billName}>{settings?.ownerName || "Click & Co"}</Text>
            <Text style={styles.billLine}>{settings?.tradingName || "Click & Co"}</Text>
            {settings?.registrationNumber && <Text style={styles.billLine}>Reg. {settings.registrationNumber}</Text>}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeadRow}>
            <Text style={[styles.th, styles.tdDesc]}>Description</Text>
            <Text style={[styles.th, styles.tdAmount]}>Amount</Text>
          </View>
          {quote.lineItems.map((line) => (
            <View key={line.id} style={styles.tableRow}>
              <View style={styles.tdDesc}>
                <Text style={styles.tdLabel}>{line.label}</Text>
                {line.description && <Text style={styles.tdSub}>{line.description}</Text>}
              </View>
              <View style={styles.tdAmount}>
                <Text>{money(line.amount)}</Text>
                {line.recurring && <Text style={styles.tdAmountSub}>per month</Text>}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          {vat === "EXCLUSIVE" && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{money(quote.subtotal + quote.monthlyTotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>VAT 15%</Text>
                <Text style={styles.totalValue}>{money(quote.vatAmount)}</Text>
              </View>
            </>
          )}
          {vat === "INCLUSIVE" && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Includes VAT 15%</Text>
              <Text style={styles.totalValue}>{money(quote.vatAmount)}</Text>
            </View>
          )}
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandValue}>{money(quote.total)}</Text>
          </View>
          {quote.monthlyTotal > 0 && (
            <View style={[styles.totalRow, { marginTop: 4 }]}>
              <Text style={[styles.totalLabel, { color: MUTED }]}>Of which monthly</Text>
              <Text style={[styles.totalValue, { color: MUTED }]}>{money(quote.monthlyTotal)}</Text>
            </View>
          )}
        </View>

        {quote.notes && (
          <View style={styles.notesBox}>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>Notes</Text>
            <Text>{quote.notes}</Text>
          </View>
        )}

        {vat === "UNSET" && (
          <View style={styles.warnBox}>
            <Text>VAT treatment is not set. Confirm it in Business details before sending this quote.</Text>
          </View>
        )}

        <View style={styles.fine}>
          <Text>Scope and final pricing remain subject to this approved quotation. A deposit secures your start date.</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderQuotePdf(quote: QuoteDTO, settings: BusinessSettings | null): Promise<Buffer> {
  return renderToBuffer(<QuoteDocument quote={quote} settings={settings} />) as Promise<Buffer>;
}
