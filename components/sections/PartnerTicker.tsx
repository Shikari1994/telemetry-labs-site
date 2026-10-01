import { disciplines } from "@/data/home";

/**
 * Discipline ticker (blueprint §6 row 03).
 *
 * Seamless because the track is duplicated and translated by exactly one copy
 * width, so the loop point is invisible. CSS-only, which lets
 * `prefers-reduced-motion` stop it without any JS coordination.
 *
 * These are the disciplines the works are made of, not client logos — the
 * page must not imply customers it cannot name.
 */
export function PartnerTicker() {
  return (
    <section className="ticker" aria-label="Из чего состоят работы">
      <p className="tickerLead">
        IN THE WORKS<span className="caret" aria-hidden="true" />
      </p>
      <div className="tickerViewport">
        <div className="tickerTrack">
          {[0, 1].map((copy) => (
            <div className="tickerCopy" key={copy} aria-hidden={copy === 1}>
              {disciplines.map((item) => (
                <span className="tickerCell" key={`${copy}-${item.code}`}>
                  <b>{item.code}</b>
                  {item.label}
                  <i aria-hidden="true">■</i>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
