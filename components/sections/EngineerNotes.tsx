const notes = [
  {
    index: "01",
    role: "DIRECTIONAL DRILLING",
    title: "TRAJECTORY FIRST",
    quote: "Один источник времени и глубины важнее десятка несвязанных красивых графиков.",
  },
  {
    index: "02",
    role: "MWD ENGINEERING",
    title: "LINK IS DATA",
    quote: "Состояние телеметрического канала должно быть видно рядом с параметрами, которые через него пришли.",
  },
  {
    index: "03",
    role: "GEOSTEERING",
    title: "CONTEXT MATTERS",
    quote: "Гамма и сопротивление имеют смысл только тогда, когда инженер понимает, где именно находится инструмент.",
  },
  {
    index: "04",
    role: "REMOTE OPERATIONS",
    title: "ONE LIVE MODEL",
    quote: "Удалённый мониторинг должен повторять рабочую картину на буровой, а не создавать вторую версию реальности.",
  },
];

export function EngineerNotes() {
  return (
    <section className="notesSection" aria-label="Engineering field notes">
      <div className="notesHeader">
        <span>[ 08 ]</span>
        <div>
          <p className="eyebrow" data-scramble data-scramble-text="FIELD NOTES / OPERATING PRINCIPLES">FIELD NOTES / OPERATING PRINCIPLES</p>
          <h2 data-reveal>НЕ ПРИНИМАЙТЕ<br />СИГНАЛ<br />КАК ДАННОСТЬ.</h2>
        </div>
        <p data-reveal>Не отзывы и не маркетинговые обещания — рабочие принципы, вокруг которых строится телеметрический контур.</p>
      </div>

      <div className="notesViewport">
        <div className="notesRail" data-notes-rail>
          {notes.map((note) => (
            <article className="noteCard" key={note.index}>
              <div className="noteCardTop"><span>{note.index}</span><b>{note.role}</b></div>
              <div className="noteGlyph" aria-hidden="true"><i /><i /><i /></div>
              <p>“{note.quote}”</p>
              <div className="noteCardBottom"><strong>{note.title}</strong><span>TS / FIELD NOTE</span></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
