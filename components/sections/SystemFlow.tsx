import type { CSSProperties } from "react";

const flow = [
  ["01", "MEASURE", "Забойные датчики"],
  ["02", "ENCODE", "Телеметрический кадр"],
  ["03", "TRANSMIT", "Гидроимпульсный канал"],
  ["04", "DECODE", "Наземный декодер"],
  ["05", "VISUALIZE", "Drill Monitor"],
];

export function SystemFlow() {
  return (
    <section className="signalPath" id="systems">
      <div className="signalPathMarquee" aria-hidden="true">
        <div className="signalPathMarqueeTrack">
          <span>MEASURE / ENCODE / TRANSMIT / DECODE / VISUALIZE / </span>
          <span>MEASURE / ENCODE / TRANSMIT / DECODE / VISUALIZE / </span>
        </div>
      </div>

      <div className="signalPathHeader">
        <span>[ 03 ]</span>
        <p className="eyebrow" data-scramble data-scramble-text="ONE SYSTEM / FULL SIGNAL PATH">ONE SYSTEM / FULL SIGNAL PATH</p>
        <h2 data-reveal>ОТ ЗАБОЯ<br />ДО ЭКРАНА.</h2>
        <p data-reveal>Не набор разрозненных приборов, а один согласованный поток данных — измерение, кодирование, передача, декодирование и инженерная визуализация.</p>
      </div>

      <div className="signalPathSteps">
        {flow.map(([n, action, label], index) => (
          <article
            className="signalPathStep"
            key={n}
            data-reveal
            data-reveal-delay={index * 70}
            style={{ "--step": index } as CSSProperties}
          >
            <span>{n}</span>
            <i data-line-draw />
            <strong>{action}</strong>
            <p>{label}</p>
            <b aria-hidden="true">→</b>
          </article>
        ))}
      </div>
    </section>
  );
}
