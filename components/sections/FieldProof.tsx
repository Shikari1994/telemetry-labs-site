const proofs = [
  {
    index: "01",
    label: "TRAJECTORY",
    value: "PLAN / FACT",
    title: "Данные должны вести к решению.",
    text: "Положение инструмента, глубина и контекст бурения отображаются в одной временной шкале, без разрыва между забоем и экраном инженера.",
  },
  {
    index: "02",
    label: "FORMATION",
    value: "GR / RES",
    title: "Геология не должна жить отдельно.",
    text: "Каротажные каналы синхронизируются с траекторией и состоянием системы, чтобы инженер видел не набор цифр, а положение относительно разреза.",
  },
  {
    index: "03",
    label: "LINK",
    value: "LIVE / QA",
    title: "Телеметрия — это ещё и качество канала.",
    text: "Диагностика передачи, валидность кадров и состояние декодирования видимы вместе с полезными параметрами, а не спрятаны в отдельном окне.",
  },
];

export function FieldProof() {
  return (
    <section className="proofSection">
      <div className="proofHeader">
        <span>[ 08 ]</span>
        <div>
          <p className="eyebrow" data-scramble data-scramble-text="FIELD PRINCIPLES / OPERATING LOGIC">FIELD PRINCIPLES / OPERATING LOGIC</p>
          <h2 data-reveal>СОЗДАНО<br />ДЛЯ БУРОВОЙ.</h2>
        </div>
        <p data-reveal>Не декоративный интерфейс вокруг датчиков, а рабочая система, где каждый канал имеет источник, время, состояние и инженерный смысл.</p>
      </div>

      <div className="proofRail" data-proof-rail>
        {proofs.map((proof) => (
          <article className="proofCard" key={proof.index}>
            <div className="proofCardHead"><span>{proof.index}</span><small>{proof.label}</small></div>
            <div className="proofCardMetric"><strong>{proof.value}</strong><i /></div>
            <h3>{proof.title}</h3>
            <p>{proof.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
