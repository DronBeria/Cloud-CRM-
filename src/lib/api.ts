import { NextResponse } from "next/server";

/** Standard API response wrapper — every endpoint should use these */

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data, error: null }, { status });
}

export function created<T>(data: T) {
  return NextResponse.json({ data, error: null }, { status: 201 });
}

export function err(message: string, status = 400) {
  return NextResponse.json({ data: null, error: message }, { status });
}

export function unauthorized() {
  return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 });
}

export function notFound(entity = "Resource") {
  return NextResponse.json({ data: null, error: `${entity} not found` }, { status: 404 });
}

export function tooMany() {
  return NextResponse.json(
    { data: null, error: "Too many requests. Please slow down." },
    { status: 429, headers: { "Retry-After": "60" } }
  );
}

export function serverError(e?: unknown) {
  console.error("[API Error]", e);
  return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
}

/** Paginated response */
export function paginated<T>(items: T[], total: number, page: number, pageSize: number) {
  return NextResponse.json({
    data: items,
    meta: { total, page, pageSize, pages: Math.ceil(total / pageSize) },
    error: null,
  });
}
