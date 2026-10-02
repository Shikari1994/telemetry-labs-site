import type { CSSProperties } from "react";
import { AlphaVideo } from "@/components/media/AlphaVideo";
import { AnchorLink } from "@/components/layout/AnchorLink";
import { SectionHead } from "@/components/sections/SectionHead";
import { openBay, services, slots, works } from "@/data/home";

const pad = (n: number) => String(n).padStart(2, "0");

/** Zero-size marks the mascot reads through the 3D transforms (lib/mascot/occlude.ts). */
const Mark = ({ at, ...data }: { at: [string, string] } & Record<`data-${string}`, boolean>) => (
  <i className="deckMark" style={{ left: at[0], top: at[1] }} {...data} />
);

/**
 * 02: what we build, as one machine. A cartridge deck in CSS 3D with four
 * slots: the works are cartridges resting loose in the first two, the rest
 * are free. The pin's scrub (MotionProvider) runs it: the mascot stands on a
 * cartridge and stamps it into its slot (lib/mascot/acts.ts, `load`), it
 * seats with a clunk, its trace lights, the screen beside the deck boots the
 * work and the channels it proves (the three directions) light up below.
 * The second cartridge goes the same way; then the free slots blink and the
 * screen turns to the invitation, while the mascot pops up out of slot 03.
 *
 * Desktop pins the whole section, phones the deck and its screen under the
 * head (the channels follow below). Without motion the deck stands loaded
 * and the screen lists every page.
 */
export function Works() {
  return (
    <section className="block programs" id="works" aria-label="Что мы делаем" data-scene data-deck>
      <div className="deckPin" data-deck-pin>
        <SectionHead
          index="02"
          label="WHAT WE BUILD / 3 DIRECTIONS"
          title={["Сайты, 3D", "и приложения"]}
          lead="Ведём продукт от идеи до запуска: дизайн, разработка, 3D и данные в реальном времени. Каждое направление подтверждено работающим проектом."
        />

        <div className="deckScene" data-deck-scene>
          <div className="deckView" data-deck-view aria-hidden="true">
            <div className="deckCam" data-deck-cam>
              <div className="deckBody" data-deck-body>
                <div className="deckTop">
                  {slots.map((slot, index) => (
                    <span
                      className={`deckMouth${slot.live ? "" : " is-free"}`}
                      key={index}
                      style={{ "--slot": index } as CSSProperties}
                      data-deck-mouth={slot.live ? undefined : true}
                    >
                      <Mark at={["0", "100%"]} data-lip />
                      <Mark at={["100%", "100%"]} data-lip />
                      <i className="deckTrace" data-deck-trace />
                    </span>
                  ))}
                  <Mark at={["0", "0"]} data-corner />
                  <Mark at={["100%", "0"]} data-corner />
                </div>
                <div className="deckFront">
                  {slots.map((slot, index) => (
                    <span className={`deckPort${slot.live ? "" : " is-free"}`} key={index} data-deck-port>
                      <b>{pad(index + 1)}</b>
                      <i />
                      <span>{slot.live ? slot.label : "OPEN"}</span>
                    </span>
                  ))}
                  <Mark at={["0", "100%"]} data-corner />
                  <Mark at={["100%", "100%"]} data-corner />
                </div>
                <div className="deckSide">
                  <Mark at={["100%", "0"]} data-corner />
                  <Mark at={["100%", "100%"]} data-corner />
                </div>

                {works.map((work, index) => (
                  <div className="deckCart" key={work.id} style={{ "--slot": index } as CSSProperties} data-deck-cart>
                    <div className="deckCartFront">
                      <span className="deckCartGrip" />
                      <span className="deckCartLabel">
                        <b>{work.index}</b>
                        <span className="deckCartShot">
                          <AlphaVideo id={work.media} />
                        </span>
                        <span className="deckCartName">{work.title}</span>
                      </span>
                      <Mark at={["0", "0"]} data-corner />
                      <Mark at={["100%", "0"]} data-corner />
                      <Mark at={["0", "100%"]} data-corner />
                      <Mark at={["100%", "100%"]} data-corner />
                    </div>
                    <div className="deckCartTop">
                      <Mark at={["50%", "50%"]} data-stand />
                      <Mark at={["0", "0"]} data-corner />
                      <Mark at={["100%", "0"]} data-corner />
                    </div>
                    <div className="deckCartSide">
                      <Mark at={["100%", "0"]} data-corner />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="tuiWin deckScreen" data-deck-screen>
            <p className="tuiWinBar" aria-hidden="true">
              <span data-deck-bar>NO CARTRIDGE</span>
            </p>
            <div className="deckPages">
              <div className="deckPage deckIdle is-on" data-deck-page data-bar="NO CARTRIDGE" aria-hidden="true">
                <p className="deckIdleWord">INSERT</p>
                <p className="deckIdleLine">
                  &gt; CARTRIDGE · SLOT 01<span className="caret" />
                </p>
              </div>
              {works.map((work, index) => (
                <article
                  className="deckPage deckWork"
                  id={work.id}
                  key={work.id}
                  data-deck-page
                  data-pin-index={index + 1}
                  data-bar={`SLOT ${pad(index + 1)} · LIVE`}
                >
                  <p className="deckBoot" aria-hidden="true">
                    <span>&gt; MOUNT SLOT {pad(index + 1)}</span>
                    <b>OK</b>
                  </p>
                  <div className="deckShot">
                    <AlphaVideo id={work.media} />
                  </div>
                  <p className="deckKicker">
                    <span>{work.index}</span> {work.kicker}
                  </p>
                  <h3>{work.title}</h3>
                  <p className="deckText">{work.text}</p>
                  <p className="deckTags">
                    {work.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </p>
                  <p className="deckActions">
                    <AnchorLink className="btn btnPx" to={work.caseId}>
                      Смотреть <span aria-hidden="true">↓</span>
                    </AnchorLink>
                    <a className="textBtn" href={work.href} target="_blank" rel="noopener noreferrer">
                      {work.hrefLabel} ↗
                    </a>
                  </p>
                </article>
              ))}
              <aside className="deckPage deckOpen" data-deck-page data-pin-index={works.length + 1} data-bar="SLOTS OPEN">
                <p className="deckOpenSlots" aria-hidden="true">
                  {slots.map((slot, index) =>
                    slot.live ? null : (
                      <span key={index}>
                        <b>{pad(index + 1)}</b>
                        <i />
                      </span>
                    ),
                  )}
                </p>
                <p className="offerTag">
                  <span aria-hidden="true">&gt;</span> {openBay.tag}
                </p>
                <p className="deckOpenText">{openBay.text}</p>
                <AnchorLink className="btn btnPx" to="request">
                  Обсудить проект <span aria-hidden="true">↓</span>
                </AnchorLink>
              </aside>
            </div>
          </div>
        </div>

        <ol className="deckChannels" data-deck-channels aria-label="Направления">
          {services.map((service) => (
            <li className="deckChannel" id={service.id} key={service.id} data-deck-channel={service.by.join(" ")}>
              <AnchorLink className="deckChannelRow" to={service.proof.to}>
                <span className="deckChannelHead">
                  <i className="deckLamp" aria-hidden="true" />
                  <b>{service.code}</b>
                  <strong>{service.title}</strong>
                </span>
                <span className="deckChannelText">{service.text}</span>
                <span className="deckChannelFoot">
                  <span className="deckProofSlots" aria-hidden="true">
                    {works.map((work, index) => (
                      <i key={work.id} data-deck-proof={index} className={(service.by as readonly string[]).includes(work.id) ? "is-by" : undefined}>
                        {pad(index + 1)}
                      </i>
                    ))}
                  </span>
                  <span className="deckProof">
                    {service.proof.label} <span aria-hidden="true">↓</span>
                  </span>
                </span>
              </AnchorLink>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
