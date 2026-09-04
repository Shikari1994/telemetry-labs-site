const notes = [
  ["01", "FIELD-READY", "Работаем от реального сценария бурения, а не от декоративной схемы."],
  ["02", "MODULAR", "Система собирается из совместимых функциональных секций под конкретную задачу."],
  ["03", "TRACEABLE", "Каждый канал имеет источник, временную привязку, состояние и диагностический контекст."],
  ["04", "REMOTE", "Наземный поток проектируется так, чтобы инженер мог сопровождать объект локально и удалённо."],
];

export function Engineering() {
  return (
    <section className="engineeringNotes">
      <div className="engineeringNotesHeader">
        <span>[ 07 ]</span>
        <div><p className="eyebrow">ENGINEERING PRESENCE</p><h2 data-reveal>BUILT FOR<br />THE RIG.</h2></div>
        <p data-reveal>Инженерная ценность появляется там, где измерение, передача и интерфейс продолжают работать как одна система в реальной буровой среде.</p>
      </div>
      <div className="engineeringNoteGrid">
        {notes.map(([number, title, text], index) => (
          <article className={`engineeringNote note${index + 1}`} key={number} data-reveal data-reveal-delay={index * 70}>
            <span>{number}</span>
            <div className="engineeringNoteGraphic" aria-hidden="true"><i /><i /><i /></div>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
