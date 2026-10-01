import { AlphaVideo } from "@/components/media/AlphaVideo";
import { AnchorLink } from "@/components/layout/AnchorLink";
import { SignalFieldCanvas } from "@/components/media/SignalFieldCanvas";
import { PixelMark } from "@/components/pixel/PixelMark";
import { PixelText } from "@/components/pixel/PixelText";
import { homeTree, owner, slots } from "@/data/home";

/* The shutdown log mirrors the boot log (components/motion/PagePreloader).
   `data-finale-visited` is filled in with the sections this visit passed. */
const haltLines = [
  ["unmount works index", "OK"],
  ["session   sections", "visited"],
  ["mascot    dock", "SLEEP"],
  ["power     off", "···"],
] as const;

/**
 * The footer is the end of the visit. Its top is an exit menu in the page's
 * text-mode language; its stage is the last screen of the page, and it powers
 * off: as the page runs out, the shutdown log types out, the mascot docks on
 * the pad and falls asleep, and the screen collapses to a line, then a dot,
 * like a CRT switched off, leaving SYSTEM HALTED. Scrolling back up runs it
 * in reverse, a reboot. MotionProvider scrubs it; the mascot reads the same
 * state (lib/motion/finale.ts). Reduced motion keeps the screen on.
 */
export function Footer() {
  return (
    <footer className="footer" id="contact">
      <div className="footerTop">
        <div className="footerBrand">
          <PixelMark cell={5} />
          <p className="footerName">
            {owner.name}
          </p>
          <p className="footerCopy">
            © 2026 {owner.name}
            <br />
            Сайты, 3D и интерфейсы для технологичных компаний
          </p>
        </div>

        <div className="tuiWin footerMenu">
          <p className="tuiWinBar" aria-hidden="true">
            <span>EXIT MENU</span>
          </p>
          <div className="footerCols">
            <nav aria-label="Разделы страницы">
              <p className="label">РАЗДЕЛЫ</p>
              {homeTree.slice(1).map((node) => (
                <AnchorLink className="footerRow" to={node.id} key={node.id}>
                  <span className="footerKey">{node.index}</span>
                  <span className="footerRowLabel">{node.label}</span>
                  <span className="footerArrow" aria-hidden="true">
                    ↵
                  </span>
                </AnchorLink>
              ))}
            </nav>
            <div>
              <p className="label">ИНДЕКС</p>
              <ul className="footerStack">
                {slots.map((slot, index) => (
                  <li key={index} className={slot.live ? undefined : "is-open"}>
                    <span className="footerKey">{String(index + 1).padStart(2, "0")}</span>
                    {slot.live ? slot.label : "свободно"}
                    <b>{slot.live ? "LIVE" : "OPEN"}</b>
                  </li>
                ))}
              </ul>
            </div>
            <div className="footerRequest">
              <p className="label">НОВЫЙ ПРОЕКТ</p>
              <p>Сайт, 3D или приложение для работы с данными — расскажите о задаче.</p>
              <AnchorLink className="btn btnPx" to="request">
                Написать <span aria-hidden="true">↗</span>
              </AnchorLink>
            </div>
          </div>
        </div>
      </div>

      <div className="footerStage" data-footer-stage>
        {/* What powers off. Poster is the fallback layer; the WebGL dot field
            draws over it once the footer is near and motion is allowed. */}
        <div className="footerScreen" data-finale-screen>
          <div className="footerScene" aria-hidden="true">
            <AlphaVideo id="footer-signal" className="footerPoster" />
            <SignalFieldCanvas className="footerField" />
          </div>

          <ol className="footerLog" aria-label="Завершение сеанса">
            {haltLines.map(([label, status]) => (
              <li key={label} data-finale-line>
                <span className="bootPrompt">&gt;</span>
                <span data-finale-type>{label}</span>
                <span className="bootDots" />
                <b data-finale-visited={status === "visited" ? "" : undefined}>{status === "visited" ? "OK" : status}</b>
              </li>
            ))}
          </ol>

          <p className="footerWordmark" aria-label="Слот 03 свободен.">
            <span className="footerWordmarkWide" data-footer-word>
              <PixelText text="СЛОТ 03 СВОБОДЕН." grid={false} />
            </span>
            <span className="footerWordmarkNarrow" data-footer-word>
              <PixelText text="СЛОТ 03" grid={false} />
              <PixelText text="СВОБОДЕН." grid={false} />
            </span>
          </p>
          <i className="footerFlash" aria-hidden="true" />
        </div>

        <i className="footerBeam" aria-hidden="true" data-finale-beam />
        <span className="footerDock" aria-hidden="true" data-footer-dock>
          <i />
          <i />
          <i />
          <i />
        </span>
        <p className="footerHalt" aria-hidden="true" data-finale-halt>
          <span data-finale-type>SYSTEM HALTED</span>
          <small data-finale-type>↑ scroll up to power on</small>
        </p>
      </div>

      <div className="footerBottom">
        <span>SW / WORKS</span>
        <span>BRIEF → DATA → INTERFACE → MOTION → LIVE</span>
        <span>INDEX / END</span>
      </div>
    </footer>
  );
}
