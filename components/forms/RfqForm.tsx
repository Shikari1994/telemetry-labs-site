"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { equipment } from "@/data/site";

type RfqFormProps = { initialProduct?: string };

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; requestId: string; deliveryConfigured: boolean }
  | { status: "error"; message: string };

const steps = [
  { index: "01", label: "Задача" },
  { index: "02", label: "Контакты" },
  { index: "03", label: "Условия" },
] as const;

export function RfqForm({ initialProduct }: RfqFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const initialCodes = useMemo(() => {
    if (!initialProduct) return [];
    return equipment.some((item) => item.code === initialProduct) ? [initialProduct] : [];
  }, [initialProduct]);

  const [selected, setSelected] = useState<string[]>(initialCodes);
  const [step, setStep] = useState(0);
  const [state, setState] = useState<SubmitState>({ status: "idle" });

  const toggleProduct = (code: string) => {
    setSelected((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]);
  };

  const goNext = () => {
    const form = formRef.current;
    if (!form) return;

    if (step === 0) {
      const requestType = form.elements.namedItem("requestType") as HTMLSelectElement | null;
      if (requestType && !requestType.checkValidity()) {
        requestType.reportValidity();
        return;
      }
    }

    if (step === 1) {
      const names = ["name", "email"];
      for (const name of names) {
        const control = form.elements.namedItem(name) as HTMLInputElement | null;
        if (control && !control.checkValidity()) {
          control.reportValidity();
          return;
        }
      }
    }

    setState({ status: "idle" });
    setStep((current) => Math.min(current + 1, steps.length - 1));
    window.scrollTo({ top: Math.max(0, form.getBoundingClientRect().top + window.scrollY - 100), behavior: "smooth" });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    setState({ status: "submitting" });
    const data = new FormData(form);
    const requestId = crypto.randomUUID();

    const payload = {
      requestId,
      requestType: String(data.get("requestType") ?? ""),
      name: String(data.get("name") ?? ""),
      company: String(data.get("company") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? ""),
      wellProfile: String(data.get("wellProfile") ?? ""),
      operatingConditions: String(data.get("operatingConditions") ?? ""),
      message: String(data.get("message") ?? ""),
      products: selected,
      website: String(data.get("website") ?? ""),
    };

    try {
      const response = await fetch("/api/rfq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { ok?: boolean; requestId?: string; deliveryConfigured?: boolean; error?: string };

      if (!response.ok || !result.ok || !result.requestId) {
        throw new Error(result.error || "Не удалось обработать заявку.");
      }

      setState({ status: "success", requestId: result.requestId, deliveryConfigured: Boolean(result.deliveryConfigured) });
      form.reset();
      setSelected([]);
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Ошибка отправки." });
    }
  };

  return (
    <form className="rfqForm rfqWizard" onSubmit={submit} ref={formRef} noValidate>
      <div className="rfqProgress" aria-label="Этапы формы">
        {steps.map((item, index) => (
          <button
            type="button"
            key={item.index}
            className={index === step ? "rfqProgressStep isActive" : index < step ? "rfqProgressStep isDone" : "rfqProgressStep"}
            onClick={() => index < step && setStep(index)}
            disabled={index > step}
          >
            <span>{item.index}</span><strong>{item.label}</strong>
          </button>
        ))}
      </div>

      <div className={step === 0 ? "rfqPanel isActive" : "rfqPanel"} aria-hidden={step !== 0}>
        <div className="rfqSectionHead"><span>01</span><strong>Что нужно собрать</strong></div>
        <label className="field fullField">
          <span>Тип запроса *</span>
          <select name="requestType" defaultValue="selection" required>
            <option value="selection">Подобрать оборудование</option>
            <option value="quotation">Получить ТКП</option>
            <option value="integration">Обсудить интеграцию</option>
            <option value="technical">Техническая консультация</option>
          </select>
        </label>
        <fieldset className="productSelector">
          <legend>Интересующее оборудование</legend>
          {equipment.map((item) => {
            const active = selected.includes(item.code);
            return (
              <button className={active ? "productChip isActive" : "productChip"} type="button" key={item.code} onClick={() => toggleProduct(item.code)} aria-pressed={active}>
                <span>{item.code}</span>{item.shortTitle}
              </button>
            );
          })}
        </fieldset>
        <div className="rfqWizardActions"><span /><button type="button" className="submitAction" onClick={goNext}>ДАЛЕЕ / КОНТАКТЫ →</button></div>
      </div>

      <div className={step === 1 ? "rfqPanel isActive" : "rfqPanel"} aria-hidden={step !== 1}>
        <div className="rfqSectionHead"><span>02</span><strong>Кто делает запрос</strong></div>
        <div className="rfqFieldGrid">
          <label className="field"><span>Имя *</span><input name="name" autoComplete="name" required minLength={2} /></label>
          <label className="field"><span>Компания</span><input name="company" autoComplete="organization" /></label>
          <label className="field"><span>Email *</span><input name="email" type="email" autoComplete="email" required /></label>
          <label className="field"><span>Телефон</span><input name="phone" type="tel" autoComplete="tel" /></label>
        </div>
        <div className="rfqWizardActions"><button type="button" className="secondaryAction" onClick={() => setStep(0)}>← НАЗАД</button><button type="button" className="submitAction" onClick={goNext}>ДАЛЕЕ / УСЛОВИЯ →</button></div>
      </div>

      <div className={step === 2 ? "rfqPanel isActive" : "rfqPanel"} aria-hidden={step !== 2}>
        <div className="rfqSectionHead"><span>03</span><strong>Контекст скважины</strong></div>
        <label className="field fullField"><span>Профиль / задача скважины</span><input name="wellProfile" placeholder="Например: горизонтальная секция, геонавигация, MWD + GR" /></label>
        <label className="field fullField"><span>Условия эксплуатации</span><input name="operatingConditions" placeholder="Диаметр, температура, давление, расход — если уже известны" /></label>
        <label className="field fullField"><span>Дополнительная информация</span><textarea name="message" rows={7} placeholder="Опишите задачу, текущую КНБК, требуемые измерения и интеграции." /></label>
        <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
        <div className="rfqReview">
          <span>SELECTED / {selected.length || "—"}</span>
          <strong>{selected.length ? selected.join(" / ") : "Оборудование не выбрано — подбор выполним по описанию задачи."}</strong>
        </div>
        <div className="rfqWizardActions"><button type="button" className="secondaryAction" onClick={() => setStep(1)}>← НАЗАД</button><button className="submitAction" type="submit" disabled={state.status === "submitting"}>{state.status === "submitting" ? "ПРОВЕРКА..." : "ОТПРАВИТЬ ЗАПРОС ↗"}</button></div>
      </div>

      <div className="formStatus" aria-live="polite">
        {state.status === "success" && <p className="statusSuccess">{state.deliveryConfigured ? "Заявка отправлена." : "Заявка прошла серверную проверку; внешний канал отправки пока не подключён."} ID: <strong>{state.requestId}</strong></p>}
        {state.status === "error" && <p className="statusError">{state.message}</p>}
      </div>
    </form>
  );
}
