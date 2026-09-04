import { NextResponse } from "next/server";
import { equipmentByCode } from "@/data/site";

type RfqPayload = {
  requestId?: string;
  requestType?: string;
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  wellProfile?: string;
  operatingConditions?: string;
  message?: string;
  products?: string[];
  website?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedRequestTypes = new Set(["selection", "quotation", "integration", "technical"]);

export async function POST(request: Request) {
  let body: RfqPayload;

  try {
    body = await request.json() as RfqPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Некорректный формат запроса." }, { status: 400 });
  }

  if (body.website) {
    return NextResponse.json({ ok: true, requestId: body.requestId || crypto.randomUUID(), deliveryConfigured: false });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const requestType = body.requestType?.trim() ?? "";
  const products = Array.isArray(body.products) ? body.products.filter((code) => Boolean(equipmentByCode[code])) : [];

  if (name.length < 2) {
    return NextResponse.json({ ok: false, error: "Укажите имя." }, { status: 422 });
  }

  if (!emailPattern.test(email)) {
    return NextResponse.json({ ok: false, error: "Укажите корректный email." }, { status: 422 });
  }

  if (!allowedRequestTypes.has(requestType)) {
    return NextResponse.json({ ok: false, error: "Выберите тип запроса." }, { status: 422 });
  }

  const requestId = body.requestId?.trim() || crypto.randomUUID();

  // Здесь будет CRM/email adapter. Персональные данные намеренно не пишутся в server logs.
  // В текущем P3 endpoint выполняет только серверную валидацию и возвращает idempotency/request ID.
  void products;

  return NextResponse.json({
    ok: true,
    requestId,
    deliveryConfigured: false,
  });
}
