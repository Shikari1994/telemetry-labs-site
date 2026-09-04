const stack = [
  ["INC", "ORIENTATION"],
  ["GR", "GAMMA RAY"],
  ["RES", "RESISTIVITY"],
  ["MWD", "TELEMETRY"],
  ["SFC", "SURFACE"],
  ["SW", "DRILL MONITOR"],
];

export function SignalMarquee() {
  return (
    <section className="stackBand" aria-label="Контур телеметрической системы">
      <div className="stackBandLead">
        <span>OUR SYSTEM STACK:</span>
        <i>←</i><i>→</i>
      </div>
      <div className="stackBandCells">
        {stack.map(([code, label], index) => (
          <div className="stackBandCell" key={code} data-reveal data-reveal-delay={index * 40}>
            <b>{code}</b>
            <span>{label}</span>
            <i aria-hidden="true">{String(index + 1).padStart(2, "0")}</i>
          </div>
        ))}
      </div>
    </section>
  );
}
