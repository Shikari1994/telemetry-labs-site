"use client";

import { useEffect, useState } from "react";

const stackGroups = [
  {
    index: "01",
    title: "DOWNHOLE",
    items: ["INCLINOMETER", "GAMMA RAY", "RESISTIVITY", "MWD TELEMETRY"],
  },
  {
    index: "02",
    title: "POWER / DRIVE",
    items: ["POWER MODULE", "MUD MOTOR / ВЗД", "BHA INTERFACES", "PULSE CHANNEL"],
  },
  {
    index: "03",
    title: "SURFACE",
    items: ["SURFACE DECODER", "DEPTH SYNC", "RIG DATA", "LINK QA"],
  },
  {
    index: "04",
    title: "SOFTWARE",
    items: ["DRILL MONITOR", "PLAN / FACT", "EVENT STREAM", "REMOTE VIEW"],
  },
];

export function Header() {
  const [stackOpen, setStackOpen] = useState(false);

  useEffect(() => {
    if (!stackOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setStackOpen(false);
    };
    document.body.classList.add("stack-menu-open");
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("stack-menu-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [stackOpen]);

  return (
    <>
      <header className="siteHeader" data-site-header>
        <div className="scrollProgress" data-scroll-progress aria-hidden="true" />

        <button className="brand uiPlaceholder" type="button" aria-disabled="true" aria-label="Telemetry Systems">
          <span className="brandMark">TS</span>
          <span className="brandText">TELEMETRY<br />SYSTEMS</span>
        </button>

        <nav className="mainNav" aria-label="Основные разделы — переходы будут подключены позже">
          <button className="uiPlaceholder" type="button" aria-disabled="true"><span>01</span> Решения</button>
          <button className="uiPlaceholder" type="button" aria-disabled="true"><span>02</span> Оборудование</button>
          <button className="uiPlaceholder" type="button" aria-disabled="true"><span>03</span> Drill Monitor</button>
          <button className="uiPlaceholder navOptional" type="button" aria-disabled="true"><span>04</span> FAQ</button>
        </nav>

        <div className="headerTools">
          <button
            className={`ecosystemButton${stackOpen ? " is-open" : ""}`}
            type="button"
            aria-expanded={stackOpen}
            aria-controls="system-stack-panel"
            onClick={() => setStackOpen((value) => !value)}
          >
            SYSTEM STACK <i aria-hidden="true">{stackOpen ? "−" : "+"}</i>
          </button>
          <button className="headerCta uiPlaceholder" type="button" aria-disabled="true" data-magnetic>
            Запросить ТКП <span>↗</span>
          </button>
        </div>
      </header>

      <div
        className={`stackMenu${stackOpen ? " is-open" : ""}`}
        id="system-stack-panel"
        aria-hidden={!stackOpen}
      >
        <div className="stackMenuTop">
          <span>TS / SYSTEM ECOSYSTEM</span>
          <span>NO ROUTING / HOMEPAGE PREVIEW</span>
          <button type="button" onClick={() => setStackOpen(false)}>CLOSE <b>×</b></button>
        </div>

        <div className="stackMenuGrid">
          <div className="stackMenuIntro">
            <span>[ SYSTEM MAP ]</span>
            <h2>ONE SIGNAL.<br />ONE STACK.</h2>
            <p>Полный путь данных от первичного измерения в КНБК до инженерного решения на поверхности.</p>
          </div>

          {stackGroups.map((group) => (
            <section className="stackMenuGroup" key={group.index}>
              <div className="stackMenuGroupHead"><span>{group.index}</span><strong>{group.title}</strong></div>
              {group.items.map((item, index) => (
                <button className="stackMenuItem uiPlaceholder" type="button" aria-disabled="true" key={item}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <b>{item}</b>
                  <i>↗</i>
                </button>
              ))}
            </section>
          ))}
        </div>

        <div className="stackMenuBottom">
          <span>INC / GR / RES / MWD / PWR / VZD / SFC / SW</span>
          <strong>MEASURE → ENCODE → TRANSMIT → DECODE → DECIDE</strong>
        </div>
      </div>
    </>
  );
}
