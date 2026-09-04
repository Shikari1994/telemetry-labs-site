import { partnerDisciplines } from "@/data/site";

/**
 * Partner/discipline ticker (blueprint §6 row 03).
 *
 * Seamless because the track is duplicated and translated by exactly one copy
 * width, so the loop point is invisible. The animation is CSS-only, which lets
 * `prefers-reduced-motion` stop it without any JS coordination.
 *
 * These are engineering disciplines, not client logos — the homepage must not
 * imply customers we cannot name.
 */
export function PartnerTicker() {
  return (
    <section className="partnerTicker" aria-label="Инженерные направления">
      <div className="partnerTickerLead">
        <span>DISCIPLINES:</span>
      </div>

      <div className="partnerTickerViewport">
        <div className="partnerTickerTrack">
          {[0, 1].map((copy) => (
            <div className="partnerTickerCopy" key={copy} aria-hidden={copy === 1}>
              {partnerDisciplines.map((item) => (
                <div className="partnerTickerCell" key={`${copy}-${item.code}`}>
                  <b>{item.code}</b>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
