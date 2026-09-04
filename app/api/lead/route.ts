import { NextResponse } from "next/server";

/**
 * Homepage conversion block (blueprint §6 row 12).
 *
 * Same policy as the RFQ route: server-side validation, honeypot, and an
 * idempotency id so a double click cannot create two leads. No destination
 * adapter is wired yet and field contents are never logged (§9).
 */

type LeadPayload = {
  requestId?: string;
  email?: string;
  topic?: string;
  /** Honeypot — must stay empty for a real submission. */
  website?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedTopics = new Set(["systems", "software", "integration"]);

export async function POST(request: Request) {
  let body: LeadPayload;

  try {
    body = (await request.json()) as LeadPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Некорректный формат запроса." }, { status: 400 });
  }

  // Honeypot hit: answer exactly like success so a bot learns nothing.
  if (body.website) {
    return NextResponse.json({ ok: true, requestId: body.requestId || crypto.randomUUID(), deliveryConfigured: false });
  }

  const email = body.email?.trim() ?? "";
  if (!emailPattern.test(email)) {
    return NextResponse.json({ ok: false, error: "Укажите корректный email." }, { status: 422 });
  }

  const topic = body.topic?.trim() ?? "";
  if (topic && !allowedTopics.has(topic)) {
    return NextResponse.json({ ok: false, error: "Выберите тему запроса." }, { status: 422 });
  }

  const requestId = body.requestId?.trim() || crypto.randomUUID();

  // TODO: подключить один destination adapter (CRM / transactional email).
  // Содержимое полей намеренно не попадает в server logs.

  return NextResponse.json({ ok: true, requestId, deliveryConfigured: false });
}
