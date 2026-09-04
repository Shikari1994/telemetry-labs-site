"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AlphaVideo } from "@/components/media/AlphaVideo";

const stages = [
  {
    index: "01",
    code: "ORIENTATION",
    title: "Понимать положение инструмента.",
    text: "Инклинометрия формирует пространственную основу системы: зенитный угол, азимут и toolface синхронизируются с глубиной и состоянием КНБК.",
    readout: [["INC", "87.42°"], ["AZM", "126.18°"], ["TF", "314.6°"]],
    active: ["INC"],
  },
  {
    index: "02",
    code: "FORMATION",
    title: "Видеть разрез во время бурения.",
    text: "Гамма и резистивиметрия добавляют геологический контекст к траектории, чтобы решение опиралось не только на геометрию ствола.",
    readout: [["GR", "92 API"], ["RES", "18.4 Ω·M"], ["TEMP", "118°C"]],
    active: ["GR", "RES"],
  },
  {
    index: "03",
    code: "TELEMETRY",
    title: "Передавать критичные данные с забоя.",
    text: "MWD-контур собирает выбранные каналы, формирует телеметрический кадр и переносит его на поверхность с заданным приоритетом параметров.",
    readout: [["PULSE", "1.20 HZ"], ["LINK", "98.7%"], ["PWR", "31.8 V"]],
    active: ["MWD", "PWR"],
  },
  {
    index: "04",
    code: "SURFACE",
    title: "Собрать поток в единую инженерную картину.",
    text: "Наземная система декодирует телеметрию, синхронизирует её с глубиной и буровыми параметрами и передаёт нормализованный поток в Drill Monitor.",
    readout: [["DEPTH", "3842.6 M"], ["LATENCY", "1.8 S"], ["STATE", "LIVE"]],
    active: ["SFC"],
  },
];

const toolModules = [
  ["INC", "ORIENTATION"],
  ["GR", "GAMMA"],
  ["RES", "RESISTIVITY"],
  ["MWD", "TELEMETRY"],
  ["PWR", "POWER"],
  ["SFC", "SURFACE"],
];

export function TelemetryStage() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const section = sectionRef.current;
    const pin = pinRef.current;
    if (!section || !pin) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const mm = gsap.matchMedia();
    mm.add("(min-width: 761px)", () => {
      /* Hoisted so the cleanup below can kill the pin explicitly. */
      let stageTimeline: gsap.core.Timeline | null = null;

      const ctx = gsap.context(() => {
        const states = gsap.utils.toArray<HTMLElement>(".labState", pin);
        const modules = gsap.utils.toArray<HTMLElement>(".labToolModule", pin);
        const railDots = gsap.utils.toArray<HTMLElement>(".labRailDot", pin);
        const categories = gsap.utils.toArray<HTMLElement>(".labCategoryList b", pin);
        const progressFill = pin.querySelector<HTMLElement>(".labProgressFill");
        const core = pin.querySelector<HTMLElement>(".labToolCore");
        const chamber = pin.querySelector<HTMLElement>(".labChamber");
        const glass = pin.querySelector<HTMLElement>(".labGlassReflection");
        const orbitA = pin.querySelector<HTMLElement>(".orbitA");
        const orbitB = pin.querySelector<HTMLElement>(".orbitB");
        const heading = pin.querySelector<HTMLElement>(".labMainHeading");
        const sideLabels = gsap.utils.toArray<HTMLElement>(".labSideLabel", pin);

        gsap.set(states, { autoAlpha: 0, y: 24, clipPath: "inset(0 0 100% 0)" });
        gsap.set(states[0], { autoAlpha: 1, y: 0, clipPath: "inset(0 0 0% 0)" });
        gsap.set(modules, { opacity: 0.14, filter: "grayscale(1) contrast(.84)" });
        gsap.set(modules.filter((node) => stages[0].active.includes(node.dataset.module ?? "")), { opacity: 1, filter: "grayscale(0) contrast(1)" });
        gsap.set(railDots, { scaleX: 0.16, opacity: 0.28, transformOrigin: "0 50%" });
        gsap.set(railDots[0], { scaleX: 1, opacity: 1 });
        gsap.set(categories, { opacity: 0.28, x: 0 });
        gsap.set(categories[0], { opacity: 1, x: 8 });
        gsap.set(chamber, { yPercent: 8, scale: 0.94 });
        gsap.set(sideLabels, { autoAlpha: 0.4 });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: section,
            start: "top top+=62",
            end: "+=4600",
            pin,
            scrub: 0.72,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
        stageTimeline = tl;

        tl.to(chamber, { yPercent: 0, scale: 1, duration: 0.42, ease: "power3.out" }, 0)
          .to(sideLabels, { autoAlpha: 1, duration: 0.32 }, 0.1)
          .to(heading, { letterSpacing: "-.075em", y: -6, duration: 4 }, 0)
          .to(progressFill, { scaleY: 1, duration: 4, transformOrigin: "50% 0" }, 0)
          .to(core, { yPercent: 5, rotate: 0.7, duration: 4 }, 0)
          .to(glass, { xPercent: 16, duration: 4 }, 0)
          .to(orbitA, { rotate: 28, scale: 1.025, duration: 4 }, 0)
          .to(orbitB, { rotate: -44, scale: 0.985, duration: 4 }, 0);

        for (let index = 1; index < stages.length; index += 1) {
          const position = index;
          const previous = states[index - 1];
          const next = states[index];
          const activeCodes = stages[index].active;
          const activeModules = modules.filter((node) => activeCodes.includes(node.dataset.module ?? ""));

          tl.to(previous, {
            autoAlpha: 0,
            y: -22,
            clipPath: "inset(100% 0 0 0)",
            duration: 0.2,
            ease: "power2.in",
          }, position - 0.18)
            .fromTo(next,
              { autoAlpha: 0, y: 26, clipPath: "inset(0 0 100% 0)" },
              { autoAlpha: 1, y: 0, clipPath: "inset(0 0 0% 0)", duration: 0.32, ease: "power3.out" },
              position - 0.02,
            )
            .to(modules, { opacity: 0.14, filter: "grayscale(1) contrast(.84)", duration: 0.18 }, position - 0.08)
            .to(activeModules, { opacity: 1, filter: "grayscale(0) contrast(1)", duration: 0.24 }, position)
            .to(railDots, { scaleX: 0.16, opacity: 0.28, duration: 0.15 }, position - 0.08)
            .to(railDots[index], { scaleX: 1, opacity: 1, duration: 0.2 }, position)
            .to(categories, { opacity: 0.28, x: 0, duration: 0.14 }, position - 0.08)
            .to(categories[index], { opacity: 1, x: 8, duration: 0.2 }, position)
            .to(core, { xPercent: index % 2 ? 2.2 : -1.5, duration: 0.38, ease: "power2.inOut" }, position - 0.08);
        }

        tl.to(states[3], { y: -8, duration: 0.6 }, 3.32)
          .to(chamber, { yPercent: -6, scale: 0.955, duration: 0.62, ease: "power2.inOut" }, 3.35)
          .to(sideLabels, { autoAlpha: 0.18, duration: 0.5 }, 3.45);
      }, pin);

      /* Leaving the desktop branch must also drop the inline styles the timeline
         wrote and remove the pin spacer. Without this the four states stay
         absolutely stacked at opacity 1 and overlap into unreadable text, and
         the spacer keeps several thousand px of empty scroll on mobile. */
      return () => {
        // `true` also removes the pin spacer, not just the trigger.
        stageTimeline?.scrollTrigger?.kill(true);
        stageTimeline?.kill();
        ctx.revert();
        gsap.set(
          [
            ...gsap.utils.toArray<HTMLElement>(".labState", pin),
            ...gsap.utils.toArray<HTMLElement>(".labToolModule", pin),
            ...gsap.utils.toArray<HTMLElement>(".labRailDot", pin),
            ...gsap.utils.toArray<HTMLElement>(".labCategoryList b", pin),
          ],
          { clearProps: "all" },
        );
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <section className="labNarrative" id="telemetry-stage" ref={sectionRef}>
      <div className="labPin" ref={pinRef}>
        <div className="labGrid" aria-label="Интерактивная схема телеметрической системы">
          <div className="labSectionNo">[ 02 ]</div>

          <div className="labTitleBlock">
            <p className="eyebrow" data-scramble data-scramble-text="БОЛЬШЕ, ЧЕМ ИЗМЕРЕНИЯ">БОЛЬШЕ, ЧЕМ ИЗМЕРЕНИЯ</p>
            <h2 className="labMainHeading" data-flicker>БОЛЬШЕ, ЧЕМ<br />ИЗМЕРЕНИЯ.</h2>
          </div>

          <div className="labSideLabel labSideLabelLeft">
            <strong>DOWNHOLE</strong>
            <span>Measurement at the source</span>
          </div>
          <div className="labSideLabel labSideLabelRight">
            <strong>SURFACE</strong>
            <span>One synchronized engineering picture</span>
          </div>

          <div className="labVisual" aria-hidden="true">
            <div className="labChamber">
              {/* Poster carries the chamber's material depth; the per-module
                  overlay stays in DOM because the scrub timeline drives it. */}
              <AlphaVideo id="lab-chamber" className="labChamberMedia" />
              <div className="labGlass">
                <div className="labGlassReflection" />
                <div className="labToolCore">
                  {toolModules.map(([code, label], index) => (
                    <div className="labToolModule" data-module={code} key={code}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{code}</strong>
                      <small>{label}</small>
                    </div>
                  ))}
                </div>
              </div>
              <div className="labChamberBase"><span>TELEMETRY / STACK</span><b>LIVE</b></div>
            </div>
            <div className="labOrbit orbitA" />
            <div className="labOrbit orbitB" />
          </div>

          <div className="labStateDeck">
            {stages.map((stage) => (
              <article className="labState" key={stage.index}>
                <div className="labStateTop">
                  <span>{stage.index} / 04</span>
                  <b>{stage.code}</b>
                </div>
                <h3>{stage.title}</h3>
                <p>{stage.text}</p>
                <div className="labReadout">
                  {stage.readout.map(([label, value]) => (
                    <div key={label}><span>{label}</span><strong>{value}</strong></div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="labCategoryList">
            <span>OUR SYSTEM SUPPORT</span>
            {stages.map((stage) => <b key={stage.code}>{stage.code}</b>)}
          </div>

          <div className="labRail" aria-hidden="true">
            {stages.map((stage) => <i className="labRailDot" key={stage.index} />)}
          </div>
          <div className="labProgress" aria-hidden="true"><i className="labProgressFill" /></div>
        </div>
      </div>

      <div className="labMobile">
        <div className="labMobileHeader">
          <span>[ 02 ]</span>
          <p className="eyebrow">БОЛЬШЕ, ЧЕМ ИЗМЕРЕНИЯ</p>
          <h2>БОЛЬШЕ, ЧЕМ<br />ИЗМЕРЕНИЯ.</h2>
        </div>
        <div className="labMobileVisual" aria-hidden="true">
          <div className="labMobileTool">INC / GR / RES / MWD / PWR / SFC</div>
        </div>
        {stages.map((stage) => (
          <article className="labMobileState" key={stage.index}>
            <span>{stage.index}</span>
            <p className="eyebrow">{stage.code}</p>
            <h3>{stage.title}</h3>
            <p>{stage.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
