"use server";

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1e293b",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
    paddingBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#e2e8f0",
  },
  companyName: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  invoiceTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: "#3b82f6",
    textAlign: "right",
  },
  invoiceNumber: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "right",
    marginTop: 4,
  },
  section: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  billingBlock: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  billingName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 2,
  },
  billingText: {
    fontSize: 10,
    color: "#475569",
    marginBottom: 2,
  },
  detailsBlock: {
    flex: 1,
    alignItems: "flex-end",
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 10,
    color: "#64748b",
    width: 80,
  },
  detailValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    padding: "8 12",
    borderRadius: 4,
    marginBottom: 2,
  },
  tableHeaderText: {
    color: "#ffffff",
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  tableRow: {
    flexDirection: "row",
    padding: "8 12",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tableRowAlt: {
    flexDirection: "row",
    padding: "8 12",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  colDescription: { flex: 4 },
  colQty: { flex: 1, textAlign: "center" },
  colPrice: { flex: 2, textAlign: "right" },
  colTotal: { flex: 2, textAlign: "right" },
  tableText: { fontSize: 10, color: "#475569" },
  totalsSection: {
    marginTop: 16,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 10,
    color: "#64748b",
    width: 100,
    textAlign: "right",
    marginRight: 16,
  },
  totalValue: {
    fontSize: 10,
    color: "#1e293b",
    width: 80,
    textAlign: "right",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: "#0f172a",
  },
  grandTotalLabel: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    width: 100,
    textAlign: "right",
    marginRight: 16,
  },
  grandTotalValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#3b82f6",
    width: 80,
    textAlign: "right",
  },
  statusBadge: {
    backgroundColor: "#dcfce7",
    color: "#166534",
    padding: "4 10",
    borderRadius: 4,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    alignSelf: "flex-start",
  },
  statusPending: {
    backgroundColor: "#dbeafe",
    color: "#1e40af",
  },
  statusCancelled: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: "#94a3b8",
  },
});

export interface InvoicePdfData {
  id: string;
  number: number;
  status: string;
  dueAt: Date | null;
  createdAt: Date;
  currencyPrefix: string;
  currencySuffix: string;
  user: {
    name: string;
    email: string;
  };
  items: {
    id: string;
    description: string;
    quantity: number;
    price: number;
  }[];
  companyName: string;
  companyEmail: string;
}

function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  const total = data.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const fmt = (amount: number) =>
    `${data.currencyPrefix}${amount.toFixed(2)}${data.currencySuffix}`;

  const statusColors =
    data.status === "paid"
      ? styles.statusBadge
      : data.status === "cancelled"
      ? { ...styles.statusBadge, ...styles.statusCancelled }
      : { ...styles.statusBadge, ...styles.statusPending };

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: styles.companyName }, data.companyName),
          React.createElement(Text, { style: { fontSize: 9, color: "#64748b", marginTop: 4 } }, data.companyEmail)
        ),
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: styles.invoiceTitle }, "INVOICE"),
          React.createElement(Text, { style: styles.invoiceNumber }, `#${data.number}`),
          React.createElement(View, { style: { marginTop: 8, alignItems: "flex-end" } },
            React.createElement(Text, { style: statusColors }, data.status.toUpperCase())
          )
        )
      ),
      // Bill To + Details
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(
          View,
          { style: styles.billingBlock },
          React.createElement(Text, { style: styles.sectionTitle }, "Bill To"),
          React.createElement(Text, { style: styles.billingName }, data.user.name),
          React.createElement(Text, { style: styles.billingText }, data.user.email)
        ),
        React.createElement(
          View,
          { style: styles.detailsBlock },
          React.createElement(
            View,
            { style: styles.detailRow },
            React.createElement(Text, { style: styles.detailLabel }, "Date:"),
            React.createElement(Text, { style: styles.detailValue }, data.createdAt.toLocaleDateString("en-US"))
          ),
          data.dueAt
            ? React.createElement(
                View,
                { style: styles.detailRow },
                React.createElement(Text, { style: styles.detailLabel }, "Due Date:"),
                React.createElement(Text, { style: styles.detailValue }, data.dueAt.toLocaleDateString("en-US"))
              )
            : null
        )
      ),
      // Table Header
      React.createElement(
        View,
        { style: styles.tableHeader },
        React.createElement(Text, { style: { ...styles.tableHeaderText, ...styles.colDescription } }, "Description"),
        React.createElement(Text, { style: { ...styles.tableHeaderText, ...styles.colQty } }, "Qty"),
        React.createElement(Text, { style: { ...styles.tableHeaderText, ...styles.colPrice } }, "Unit Price"),
        React.createElement(Text, { style: { ...styles.tableHeaderText, ...styles.colTotal } }, "Total")
      ),
      // Table Rows
      ...data.items.map((item, index) =>
        React.createElement(
          View,
          { key: item.id, style: index % 2 === 0 ? styles.tableRow : styles.tableRowAlt },
          React.createElement(Text, { style: { ...styles.tableText, ...styles.colDescription } }, item.description),
          React.createElement(Text, { style: { ...styles.tableText, ...styles.colQty, textAlign: "center" } }, String(item.quantity)),
          React.createElement(Text, { style: { ...styles.tableText, ...styles.colPrice, textAlign: "right" } }, fmt(item.price)),
          React.createElement(Text, { style: { ...styles.tableText, ...styles.colTotal, textAlign: "right" } }, fmt(item.price * item.quantity))
        )
      ),
      // Totals
      React.createElement(
        View,
        { style: styles.totalsSection },
        React.createElement(
          View,
          { style: styles.grandTotalRow },
          React.createElement(Text, { style: styles.grandTotalLabel }, "Total"),
          React.createElement(Text, { style: styles.grandTotalValue }, fmt(total))
        )
      ),
      // Footer
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(Text, { style: styles.footerText }, `${data.companyName} — Thank you for your business!`),
        React.createElement(Text, { style: styles.footerText }, `Invoice #${data.number}`)
      )
    )
  );
}

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const element = React.createElement(InvoiceDocument, { data });
  const buffer = await renderToBuffer(element);
  return buffer as unknown as Buffer;
}
