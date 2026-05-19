/**
 * GST (Goods & Services Tax) calculation for India
 * Supports IGST (inter-state), CGST+SGST (intra-state), UTGST (union territories)
 */

export type GSTType = "igst" | "cgst_sgst" | "utgst" | "none";

export interface GSTBreakdown {
  type: GSTType;
  rate: number;
  baseAmount: number;
  // IGST
  igst?: number;
  // CGST + SGST (split equally)
  cgst?: number;
  sgst?: number;
  // UTGST
  utgst?: number;
  totalGst: number;
  totalWithGst: number;
}

export function calculateGST(
  baseAmount: number,
  gstRate: number,
  gstType: GSTType = "igst"
): GSTBreakdown {
  if (gstType === "none" || gstRate <= 0) {
    return { type: "none", rate: 0, baseAmount, totalGst: 0, totalWithGst: baseAmount };
  }

  const gstAmount = (baseAmount * gstRate) / 100;

  if (gstType === "igst") {
    return {
      type: "igst",
      rate: gstRate,
      baseAmount,
      igst: gstAmount,
      totalGst: gstAmount,
      totalWithGst: baseAmount + gstAmount,
    };
  }

  if (gstType === "cgst_sgst") {
    const halfRate = gstRate / 2;
    const halfAmount = gstAmount / 2;
    return {
      type: "cgst_sgst",
      rate: gstRate,
      baseAmount,
      cgst: halfAmount,
      sgst: halfAmount,
      totalGst: gstAmount,
      totalWithGst: baseAmount + gstAmount,
    };
  }

  if (gstType === "utgst") {
    const halfRate = gstRate / 2;
    const halfAmount = gstAmount / 2;
    return {
      type: "utgst",
      rate: gstRate,
      baseAmount,
      cgst: halfAmount,
      utgst: halfAmount,
      totalGst: gstAmount,
      totalWithGst: baseAmount + gstAmount,
    };
  }

  return { type: "none", rate: 0, baseAmount, totalGst: 0, totalWithGst: baseAmount };
}

// Standard GST rates in India
export const GST_RATES = [0, 5, 12, 18, 28];

// Validate GSTIN format (15-character alphanumeric)
export function validateGSTIN(gstin: string): boolean {
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return regex.test(gstin.toUpperCase());
}

// Determine GST type based on supplier and buyer state
export function determineGSTType(
  supplierState: string,
  buyerState: string
): GSTType {
  if (!supplierState || !buyerState) return "igst";
  if (supplierState.toLowerCase() === buyerState.toLowerCase()) return "cgst_sgst";
  return "igst";
}

// Format GST number on invoice
export function formatGSTLabel(breakdown: GSTBreakdown, prefix = "₹"): string[] {
  const lines: string[] = [];
  if (breakdown.type === "igst" && breakdown.igst) {
    lines.push(`IGST @ ${breakdown.rate}%: ${prefix}${breakdown.igst.toFixed(2)}`);
  } else if ((breakdown.type === "cgst_sgst" || breakdown.type === "utgst") && breakdown.cgst) {
    lines.push(`CGST @ ${breakdown.rate / 2}%: ${prefix}${breakdown.cgst.toFixed(2)}`);
    if (breakdown.sgst) lines.push(`SGST @ ${breakdown.rate / 2}%: ${prefix}${breakdown.sgst.toFixed(2)}`);
    if (breakdown.utgst) lines.push(`UTGST @ ${breakdown.rate / 2}%: ${prefix}${breakdown.utgst.toFixed(2)}`);
  }
  return lines;
}
