"use client";

import { useId, useRef, useState } from "react";

type Status = "idle" | "sending" | "ok" | "error";

/* GitHub Pages serves static files only, so the /api/lead route does not exist
   there. The build sets this flag to say so up front instead of letting the
   submit fail with a 405. */
const STATIC_DEMO = process.env.NEXT_PUBLIC_STATIC_DEMO === "1";

const topics = [
  ["systems", "Забойные системы"],
  ["software", "Drill Monitor"],
  ["integration", "Интеграция на буровой"],
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
    <section className="nextStage" aria-labelledby={`${emailId}-heading`}>
      <div className="nextStageHead">
        <span>[ 11 ]</span>
        <div>
          <p className="eyebrow" data-scramble data-scramble-text="NEXT STEP / ENGINEERING CONTACT">
            NEXT STEP / ENGINEERING CONTACT
          </p>
          <h2 id={`${emailId}-heading`} data-reveal>
            ОБСУДИТЬ
            <br />
            КОНФИГУРАЦИЮ.
          </h2>
        </div>
        <p data-reveal>
          Оставьте email — вернёмся с инженерным разбором задачи, а не с рекламным письмом.
        </p>
      </div>

      {status === "ok" ? (
        <div className="nextStageDone" role="status">
          <strong>ЗАПРОС ПРИНЯТ</strong>
          <p>Мы свяжемся с вами по указанному адресу.</p>
        </div>
      ) : (
        <form className="nextStageForm" onSubmit={submit} noValidate>
          {/* Honeypot: скрыт от людей, но доступен ботам. */}
          <div className="nextStageTrap" aria-hidden="true">
            <label htmlFor={`${emailId}-website`}>Не заполняйте это поле</label>
            <input id={`${emailId}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <div className="nextStageField">
            <label htmlFor={topicId}>ТЕМА</label>
            <select id={topicId} value={topic} onChange={(e) => setTopic(e.target.value)}>
              {topics.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="nextStageField nextStageFieldEmail">
            <label htmlFor={emailId}>EMAIL</label>
            <input
              id={emailId}
              ref={inputRef}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="engineer@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={status === "error"}
              aria-describedby={status === "error" ? errorId : undefined}
              required
            />
          </div>

          <button
            className="orangeButton nextStageSubmit"
            type="submit"
            disabled={status === "sending" || STATIC_DEMO}
          >
            {status === "sending" ? "ОТПРАВКА…" : "ОТПРАВИТЬ ↗"}
          </button>

          <p className="nextStageError" id={errorId} role={STATIC_DEMO ? undefined : "alert"}>
            {STATIC_DEMO ? "ДЕМО-СБОРКА / ОТПРАВКА ОТКЛЮЧЕНА" : status === "error" ? error : ""}
          </p>
        </form>
      )}
    </section>
  );
}
