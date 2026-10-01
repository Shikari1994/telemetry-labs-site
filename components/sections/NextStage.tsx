"use client";

import { useId, useRef, useState } from "react";
import { SectionHead } from "@/components/sections/SectionHead";

type Status = "idle" | "sending" | "ok" | "error";

/* GitHub Pages serves static files only, so the /api/lead route does not exist
   there. The build sets this flag to say so up front instead of letting the
   submit fail with a 405. */
const STATIC_DEMO = process.env.NEXT_PUBLIC_STATIC_DEMO === "1";

const topics = [
  ["website", "Сайт"],
  ["3d", "3D / WebGL"],
  ["app", "Приложение"],
  ["other", "Другое"],
] as const;

/**
 * Conversion block before the footer (blueprint §6 row 12).
 *
 * Keeps a stable idempotency id per attempt so a double submit cannot create
 * two leads, and holds the typed value locally on network failure so a retry
 * does not lose input (§9).
 */
export function NextStage() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<string>(topics[0][0]);
  const requestId = useRef<string>("");
  const emailId = useId();
  const topicId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "sending") return;

    const form = event.currentTarget;
    const honeypot = (form.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setStatus("error");
      setError("Укажите корректный email.");
      inputRef.current?.focus();
      return;
    }

    if (!requestId.current) requestId.current = crypto.randomUUID();
    setStatus("sending");
    setError("");

    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), topic, website: honeypot, requestId: requestId.current }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        setStatus("error");
        setError(data.error ?? "Не удалось отправить запрос.");
        inputRef.current?.focus();
        return;
      }

      setStatus("ok");
    } catch {
      // Значение намеренно остаётся в поле, чтобы повтор не потерял ввод.
      setStatus("error");
      setError("Сеть недоступна. Попробуйте ещё раз.");
    }
  };

  return (
    <section className="block nextStage" id="request" aria-labelledby={`${emailId}-heading`} data-scene>
      <SectionHead
        index="07"
        label="NEXT STEP / NEW PROJECT"
        title={["Слот 03", "свободен"]}
        titleId={`${emailId}-heading`}
        lead="Сайт, 3D-визуализация или приложение — оставьте email, и мы ответим с разбором вашей задачи, а не шаблонным письмом."
      />

      <div className="tuiWin terminal">
        <p className="tuiWinBar" aria-hidden="true">
          <span>
            REQUEST<b className="terminalPkt"> · PKT 03</b>
          </span>
        </p>

        {status === "ok" ? (
          <div className="terminalDone" role="status">
            <p>
              <span className="terminalPrompt">&gt;</span> request --send
            </p>
            <p className="terminalBar" aria-hidden="true">
              {"▓".repeat(24)} 100%
            </p>
            <strong>ЗАПРОС ПРИНЯТ</strong>
            <p>Мы свяжемся с вами по указанному адресу.</p>
          </div>
        ) : (
          <form className="terminalForm" onSubmit={submit} noValidate>
            {/* Honeypot: скрыт от людей, но доступен ботам. */}
            <div className="terminalTrap" aria-hidden="true">
              <label htmlFor={`${emailId}-website`}>Не заполняйте это поле</label>
              <input id={`${emailId}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            <div className="terminalField">
              <label htmlFor={topicId}>
                <span className="terminalPrompt">&gt;</span> ТЕМА
              </label>
              <select id={topicId} value={topic} onChange={(e) => setTopic(e.target.value)}>
                {topics.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="terminalField">
              <label htmlFor={emailId}>
                <span className="terminalPrompt">&gt;</span> EMAIL
              </label>
              <input
                id={emailId}
                ref={inputRef}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={status === "error"}
                aria-describedby={status === "error" ? errorId : undefined}
                required
              />
            </div>

            <div className="terminalActions">
              <button className="btn btnPx" type="submit" disabled={status === "sending" || STATIC_DEMO}>
                {status === "sending" ? "Отправка…" : "Отправить"} <span aria-hidden="true">↗</span>
              </button>
              <p className="terminalError" id={errorId} role={STATIC_DEMO ? undefined : "alert"}>
                {STATIC_DEMO ? "ДЕМО-СБОРКА / ОТПРАВКА ОТКЛЮЧЕНА" : status === "error" ? error : ""}
              </p>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
