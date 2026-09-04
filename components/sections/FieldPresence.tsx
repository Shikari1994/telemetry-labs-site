const presence = [
  {
    index: "01",
    code: "ORIENTATION",
    title: "Траектория начинается с доверия к измерению.",
    text: "Контроль положения инструмента — базовый слой для всех последующих решений по направленному бурению.",
    metric: "INC / AZM / TF",
  },
  {
    index: "02",
    code: "FORMATION",
    title: "Каротаж должен быть привязан ко времени и глубине.",
    text: "Гамма и резистивиметрия становятся полезными только в связке с траекторией, глубиной и состоянием инструмента.",
    metric: "GR / RES",
  },
  {
    index: "03",
    code: "TELEMETRY",
    title: "Канал передачи — часть измерительной системы.",
    text: "Валидность кадра, стабильность связи и приоритет каналов контролируются вместе с полезными параметрами.",
    metric: "LINK / FRAME",
  },
  {
    index: "04",
    code: "SURFACE",
    title: "Декодирование не должно отрывать данные от контекста.",
    text: "Наземный контур синхронизирует телеметрию с глубиной, буровыми параметрами и рабочей временной шкалой.",
    metric: "DEPTH / TIME",
  },
  {
    index: "05",
    code: "SOFTWARE",
    title: "Инженер должен видеть систему, а не набор окон.",
    text: "Drill Monitor объединяет траекторию, телеметрию, диагностику и события в одном рабочем интерфейсе.",
    metric: "PLAN / FACT",
  },
];

export function FieldPresence() {
  return (
    <section className="presenceSection" aria-label="Field presence">
      <div className="presenceHeader">
        <span>[ 06 ]</span>
        <div>
          <p className="eyebrow" data-scramble data-scramble-text="FIELD PRESENCE / ENGINEERING SIGNALS">FIELD PRESENCE / ENGINEERING SIGNALS</p>
          <h2 data-reveal>ПРИСУТСТВИЕ<br />НА ОБЪЕКТЕ.</h2>
        </div>
        <p data-reveal>Пять точек, где качество системы определяется не внешним эффектом, а связностью данных и инженерной логикой.</p>
      </div>

      <div className="presenceGrid">
        {presence.map((item, index) => (
          <article className={`presenceCard presenceCard${index + 1}`} key={item.index} data-presence-card>
            <div className="presenceCardTop"><span>{item.index}</span><b>{item.code}</b><i>↗</i></div>
            <div className="presenceCardVisual" aria-hidden="true">
              <div className="presenceScan"><i /><i /><i /><i /><i /></div>
              <strong>{item.metric}</strong>
              <span>FIELD / SIGNAL</span>
            </div>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
