/**
 * Input sanitization — prevents XSS and injection attacks.
 * Used before storing any user-generated content.
 */

// Strip all HTML tags — for plain text fields
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

// Escape HTML entities — for safe rendering in contexts that might render HTML
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// Sanitize a plain text input — remove HTML, trim, enforce max length
export function sanitizeText(input: string, maxLength = 10000): string {
  return stripHtml(input).slice(0, maxLength);
}

// Sanitize short fields (names, labels, subjects)
export function sanitizeShort(input: string): string {
  return sanitizeText(input, 500);
}

// Sanitize email
export function sanitizeEmail(input: string): string {
  return input.toLowerCase().trim().slice(0, 320);
}

// Validate and sanitize URL — allow only http/https
export function sanitizeUrl(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

// Remove null bytes and control characters that can cause DB issues
export function sanitizeForDb(input: string): string {
  return input.replace(/\0/g, "").replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

// Full pipeline — use this for all user text input before DB storage
export function sanitize(input: unknown, maxLength = 5000): string {
  if (typeof input !== "string") return "";
  return sanitizeForDb(stripHtml(input)).slice(0, maxLength).trim();
}
