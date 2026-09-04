import { AlphaVideo } from "@/components/media/AlphaVideo";
import { SignalFieldCanvas } from "@/components/media/SignalFieldCanvas";

export function Footer() {
  return (
    <footer className="footerLab" id="contact">
      <div className="footerLabTop">
        <span>[ 13 ]</span>
        <p className="eyebrow" data-scramble data-scramble-text="ENGINEERING REQUEST / NEXT SYSTEM">ENGINEERING REQUEST / NEXT SYSTEM</p>
      </div>

      <div className="footerLabTitle" data-reveal>
        <span>СТРОИМ</span>
        <strong>ПУТЬ СИГНАЛА.</strong>
      </div>

      {/* Poster is the fallback layer; the WebGL field draws over it once the
          footer is near the viewport and the visitor allows motion. */}
      <div className="footerLabScene" aria-hidden="true">
        <AlphaVideo id="footer-signal" className="footerLabPoster" />
        <SignalFieldCanvas className="footerLabField" />
      </div>

      <div className="footerLabBottom" data-reveal>
        <button className="orangeButton footerLabCta uiPlaceholder" type="button" aria-disabled="true" data-magnetic>ЗАПРОСИТЬ ТКП ↗</button>
        <div className="footerLabNav">
          <button className="uiPlaceholder" type="button" aria-disabled="true">РЕШЕНИЯ</button>
          <button className="uiPlaceholder" type="button" aria-disabled="true">ОБОРУДОВАНИЕ</button>
          <button className="uiPlaceholder" type="button" aria-disabled="true">DRILL MONITOR</button>
          <button className="uiPlaceholder" type="button" aria-disabled="true">FAQ</button>
        </div>
        <div className="footerLabMeta"><span>TS / LAB</span><span>© 2026</span><span>DOWNHOLE TELEMETRY</span></div>
      </div>
    </footer>
  );
}
