const programs = [
  {
    index: "01",
    kicker: "DOWNHOLE / CLOSED LOOP",
    title: "MEASURE\nWHILE DRILLING.",
    text: "Инклинометрия, гамма, резистивиметрия, питание и телеметрический канал работают как единый забойный контур. Система проектируется от требуемых решений, а не от списка приборов.",
    tags: ["INC / AZM / TF", "GR / RES", "MWD / PULSE"],
  },
  {
    index: "02",
    kicker: "SURFACE / DECISION LOOP",
    title: "DECODE\nIN CONTEXT.",
    text: "Наземный декодер, глубина, буровые параметры и Drill Monitor собирают телеметрию в одну временную модель — для контроля траектории, геонавигации и удалённого сопровождения.",
    tags: ["DEPTH SYNC", "LIVE QA", "REMOTE VIEW"],
  },
];

export function SystemPrograms() {
  return (
    <section className="programsSection" aria-label="Ключевые контуры системы">
      <div className="programsHeader">
        <span>[ 02 ]</span>
        <div>
          <p className="eyebrow" data-scramble data-scramble-text="TWO LOOPS / ONE SYSTEM">TWO LOOPS / ONE SYSTEM</p>
          <h2 data-reveal>FROM BOTTOMHOLE<br />TO DECISION.</h2>
        </div>
        <p data-reveal>Две инженерные петли объединены одним потоком данных: измерить внизу и правильно интерпретировать наверху.</p>
      </div>

      <div className="programsGrid">
        {programs.map((program, idx) => (
          <article className={`programCard programCard${idx + 1}`} key={program.index} data-program-card>
            <div className="programCardTop"><span>{program.index}</span><small>{program.kicker}</small></div>
            <div className="programCardVisual" aria-hidden="true">
              <div className="programRing ring1" />
              <div className="programRing ring2" />
              <div className="programCore"><i /><i /><i /><i /></div>
              <span className="programPulse" />
            </div>
            <h3>{program.title.split("\n").map((line) => <span key={line}>{line}</span>)}</h3>
            <p>{program.text}</p>
            <div className="programTags">{program.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
