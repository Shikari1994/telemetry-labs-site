import { slots } from "@/data/home";

/**
 * Works index band. Each slot "mounts" like a boot step: a filled slot's bar
 * loads and resolves to LIVE; an open slot stays empty and waits. The markup
 * ships the finished state, so without motion the band simply reads as loaded.
 */
export function WorksIndex() {
  const live = slots.filter((slot) => slot.live).length;
  return (
    <section className="stackBand" aria-label="Индекс работ">
      <p className="stackBandLead">
        <span>Works index</span>
        <span className="keyHint">
          {String(live).padStart(2, "0")} LIVE / {String(slots.length - live).padStart(2, "0")} OPEN
        </span>
      </p>
      <div className="stackBandCells">
        {slots.map((slot, index) => (
          <div
            className={`stackBandCell${slot.live ? "" : " is-open"}`}
            key={index}
            data-stack-cell
            data-stack-level={slot.live ? 1 : 0}
          >
            <span className="stackBandNo">{String(index + 1).padStart(2, "0")}</span>
            <b>{slot.code}</b>
            <span className="stackBandLabel">{slot.label}</span>
            <span className="stackBandBar" data-stack-bar aria-hidden="true">
              <span data-bar-fill>{slot.live ? "▓▓▓▓▓▓▓▓" : ""}</span>
              <span data-bar-rest>{slot.live ? "" : "░░░░░░░░"}</span>
              <span className="stackBandOk" data-stack-ok>
                {slot.live ? "LIVE" : "WAIT"}
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
