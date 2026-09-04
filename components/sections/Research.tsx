const research = [
  {
    index: "01",
    category: "MWD / TELEMETRY",
    title: "Как проектировать канал данных от забоя к поверхности",
    date: "RESEARCH / 001",
  },
  {
    index: "02",
    category: "DIRECTIONAL / QA",
    title: "Инклинометрия: измерение, контроль качества и привязка к глубине",
    date: "RESEARCH / 002",
  },
  {
    index: "03",
    category: "LWD / FORMATION",
    title: "Гамма и резистивиметрия как единый контекст геонавигации",
    date: "RESEARCH / 003",
  },
  {
    index: "04",
    category: "SOFTWARE / SURFACE",
    title: "Plan / Fact и событийная модель в Drill Monitor",
    date: "RESEARCH / 004",
  },
];

export function Research() {
  return (
    <section className="researchSection" aria-label="Research and insights">
      <div className="researchHeader">
        <span>[ 10 ]</span>
        <div>
          <p className="eyebrow" data-scramble data-scramble-text="LATEST RESEARCH / TECHNICAL NOTES">LATEST RESEARCH / TECHNICAL NOTES</p>
          <h2 data-reveal>LATEST<br />RESEARCH.</h2>
        </div>
        <button className="textLink uiPlaceholder" type="button" aria-disabled="true">ВСЕ МАТЕРИАЛЫ ↗</button>
      </div>

      <div className="researchGrid">
        {research.map((item) => (
          <article className="researchCard placeholderRow" role="button" tabIndex={0} aria-disabled="true" key={item.index} data-research-card>
            <div className="researchCardMedia" aria-hidden="true">
              <span>{item.index}</span>
              <div className="researchWave"><i /><i /><i /><i /><i /><i /><i /></div>
              <b>{item.category.split(" / ")[0]}</b>
            </div>
            <div className="researchCardBody">
              <span>{item.category}</span>
              <h3>{item.title}</h3>
              <div><small>{item.date}</small><b>↗</b></div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
