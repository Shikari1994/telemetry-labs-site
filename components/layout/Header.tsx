"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { AnchorLink } from "@/components/layout/AnchorLink";
import { PixelMark } from "@/components/pixel/PixelMark";
import { SITE_URL, owner, screens, works } from "@/data/home";

type IndexItem = { label: string; to?: string; href?: string };

const indexGroups: { index: string; title: string; items: IndexItem[] }[] = [
  {
    index: "01",
    title: "GEO-TN.COM / WEBSITE",
    items: [
      { label: "Карточка работы", to: "work-site" },
      { label: "Витрина сайта", to: "case-site" },
      { label: "Открыть geo-tn.com", href: SITE_URL },
    ],
  },
  {
    index: "02",
    title: "DRILL MONITOR / PLATFORM",
    items: [
      { label: "Карточка работы", to: "work-monitor" },
      { label: "Слои платформы", to: "drill-monitor" },
      { label: `Возможности · ${screens.length}`, to: "screens" },
    ],
  },
  {
    index: "03",
    title: "STACK",
    items: [{ label: "Технологии", to: "stack" }],
  },
  {
    index: "04",
    title: "NEXT",
    items: [
      { label: "Слот 03 — свободен", to: "request" },
      { label: "Слот 04 — свободен", to: "request" },
      { label: "Написать", to: "request" },
    ],
  },
];

const nav = [
  ["1", "Работы", "works"],
  ["2", "geo-tn.com", "case-site"],
  ["3", "Drill Monitor", "drill-monitor"],
  ["4", "Стек", "stack"],
] as const;

export function Header() {
  const [stackOpen, setStackOpen] = useState(false);

  /* [S] toggles the works index: an in-page panel, never a route change. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Escape") setStackOpen(false);
      if (event.key === "s" || event.key === "S" || event.key === "ы" || event.key === "Ы") {
        setStackOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("stack-menu-open", stackOpen);
    return () => document.body.classList.remove("stack-menu-open");
  }, [stackOpen]);

  const close = () => setStackOpen(false);

  return (
    <>
      <header className="siteHeader" data-site-header>
        <AnchorLink className="brand" to="top" aria-label={`${owner.name} — наверх`}>
          <PixelMark cell={3} />
          <span className="brandText">
            {owner.name}
          </span>
        </AnchorLink>

        <nav className="mainNav" aria-label="Разделы страницы">
          {nav.map(([key, label, to]) => (
            <AnchorLink className="navItem" to={to} key={key}>
              <span className="keyHint">[{key}]</span> {label}
            </AnchorLink>
          ))}
        </nav>

        <div className="headerTools">
          <button
            className={`stackButton${stackOpen ? " is-open" : ""}`}
            type="button"
            aria-expanded={stackOpen}
            aria-controls="system-stack-panel"
            onClick={() => setStackOpen((value) => !value)}
          >
            <span className="keyHint">[S]</span> Индекс
          </button>
          <AnchorLink className="btn btnSolid" to="request">
            Связаться <span aria-hidden="true">↗</span>
          </AnchorLink>
        </div>

        <button
          className="navToggle"
          type="button"
          aria-expanded={stackOpen}
          aria-controls="system-stack-panel"
          aria-label={stackOpen ? "Закрыть меню" : "Открыть меню"}
          onClick={() => setStackOpen((value) => !value)}
        >
          <span aria-hidden="true">{stackOpen ? "[×]" : "[≡]"}</span>
        </button>
      </header>

      <div className={`stackMenu${stackOpen ? " is-open" : ""}`} id="system-stack-panel" aria-hidden={!stackOpen}>
        <div className="stackMenuTop">
          <span>SW / WORKS INDEX</span>
          <span>
            {String(works.length).padStart(2, "0")} WORKS / 02 OPEN SLOTS
          </span>
          <button type="button" onClick={close} tabIndex={stackOpen ? 0 : -1}>
            <span className="keyHint">[ESC]</span> Закрыть
          </button>
        </div>

        <div className="stackMenuGrid">
          <div className="stackMenuIntro">
            <p className="label">[ INDEX ]</p>
            <h2>Two works. One field.</h2>
            <p>Всё, что сейчас есть в портфолио, по разделам. Выберите пункт — страница прокрутится к нему.</p>
          </div>

          <div className="stackMenuGroups">
            {indexGroups.map((group, groupIndex) => (
              <section className="stackMenuGroup" key={group.index}>
                <p className="stackMenuGroupHead">
                  <span>{group.index}</span> {group.title}
                </p>
                {group.items.map((item, index) => {
                  const inner = (
                    <>
                      <span className="br">└</span>
                      <span className="stackMenuNo">{String(index + 1).padStart(2, "0")}</span>
                      <b>{item.label}</b>
                      <i aria-hidden="true">{item.href ? "↗" : "↘"}</i>
                    </>
                  );
                  const style = { "--i": groupIndex * 4 + index } as CSSProperties;
                  return item.href ? (
                    <a
                      className="stackMenuItem"
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      tabIndex={stackOpen ? 0 : -1}
                      key={item.label}
                      style={style}
                    >
                      {inner}
                    </a>
                  ) : (
                    <AnchorLink
                      className="stackMenuItem"
                      to={item.to!}
                      tabIndex={stackOpen ? 0 : -1}
                      key={item.label}
                      style={style}
                      onClick={close}
                    >
                      {inner}
                    </AnchorLink>
                  );
                })}
              </section>
            ))}
          </div>
        </div>

        <div className="stackMenuBottom">
          <span>WEB / APP / ··· / ···</span>
          <strong>BRIEF → DATA → INTERFACE → MOTION → LIVE</strong>
        </div>
      </div>
    </>
  );
}
