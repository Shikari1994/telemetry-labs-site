import type { CSSProperties } from "react";
import { AnchorLink } from "@/components/layout/AnchorLink";
import { AlphaVideo } from "@/components/media/AlphaVideo";
import { SectionHead } from "@/components/sections/SectionHead";
import { SectionOffer } from "@/components/sections/SectionOffer";
import { screens } from "@/data/home";

const total = String(screens.length).padStart(2, "0");

/**
 * Case 02 features, closing the case with its offer. The screens sit in a
 * viewer: one large monitor window holding the captures as a 3D stack, the
 * next ones peeking out behind the one in front, and a channel list beside it. Scrolling flips the front capture down out of the
 * window and the stack moves up a place (MotionProvider pins the section on
 * desktop, the window and the channel under the head on phones); the list
 * selects the same channel. Reduced motion gets the captures as a flat,
 * snapping row and the whole list.
 */
export function Screens() {
  return (
    <section className="block systems" id="screens" data-viewer>
      <div className="viewerPin" data-viewer-pin>
        <SectionHead
          index="05"
          label="CASE 02 / FEATURES"
          title={["Что умеет", "Drill Monitor"]}
          lead="Экраны программы для Windows и Android: от пульта бурильщика до паспорта прибора в телефоне."
        />

        <div className="viewerScene" data-viewer-scene>
          <div className="viewer">
            <div className="tuiWin viewerWin" data-viewer-win>
              <p className="tuiWinBar" aria-hidden="true">
                <span>
                  DRILL MONITOR · CH <b data-viewer-ch>01</b>/{total}
                </span>
              </p>
              <div className="viewerStage" data-viewer-stage>
                {screens.map((screen, index) => (
                  <figure
                    className={`viewerShot${index === 0 ? " is-front" : ""}`}
                    key={screen.slug}
                    data-viewer-shot
                    style={{ "--i": index, zIndex: screens.length - index } as CSSProperties}
                  >
                    <AlphaVideo id={screen.media} />
                    <span className="viewerShade" aria-hidden="true" />
                    <figcaption className="viewerTag" aria-hidden="true">
                      {screen.code}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>

            <ol className="viewerList">
              {screens.map((screen, index) => (
                <li
                  className={index === 0 ? "is-active" : undefined}
                  id={`screen-${screen.slug}`}
                  key={screen.slug}
                  data-viewer-item
                  data-viewer-index={index}
                >
                  <AnchorLink className="viewerRow" to={`screen-${screen.slug}`}>
                    <span className="viewerNo">{screen.index}</span>
                    <span className="viewerText">
                      <span className="viewerCode">{screen.code}</span>
                      <strong>{screen.title}</strong>
                      <span className="viewerLine">{screen.text}</span>
                    </span>
                  </AnchorLink>
                </li>
              ))}
            </ol>
          </div>

          <div className="viewerStatus" aria-hidden="true">
            <span>SCREENS {total}</span>
            <span className="viewerBar" data-viewer-bar>
              <span data-bar-fill />
              <span data-bar-rest>{"░".repeat(20)}</span>
              <span data-bar-pct>00%</span>
            </span>
          </div>
        </div>
      </div>
      <SectionOffer offer="monitor" />
    </section>
  );
}
