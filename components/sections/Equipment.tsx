import { equipment } from "@/data/site";

export function Equipment() {
  return (
    <section className="equipmentLab" id="equipment">
      <div className="equipmentLabHeader">
        <span>[ 04 ]</span>
        <div>
          <p className="eyebrow" data-scramble data-scramble-text="DOWNHOLE STACK / MODULES">DOWNHOLE STACK / MODULES</p>
          <h2 data-reveal>ПОЛНЫЙ<br />ИНСТРУМЕНТАЛЬНЫЙ<br />КОНТУР.</h2>
        </div>
        <p data-reveal>Каждый модуль решает отдельную задачу, но работает как часть одной измерительной и телеметрической архитектуры.</p>
      </div>

      <div className="equipmentLabBody">
        <aside className="equipmentLabAside">
          <div className="equipmentAsideCopy" data-reveal>
            <span>END-TO-END SUPPORT</span>
            <strong>FROM SENSOR<br />TO SOFTWARE</strong>
          </div>

          <div className="equipmentAsideVisual" aria-hidden="true">
            <div className="equipmentAsideAxis" />
            <div className="equipmentAsideStack">
              {equipment.map((item, index) => (
                <i className="equipmentAsideSegment" data-segment={index} key={item.code}>
                  <small>{item.code}</small>
                </i>
              ))}
            </div>
            <span className="equipmentAsideTag">MODULAR BHA / 01—08</span>
          </div>

          <button className="orangeButton uiPlaceholder" type="button" aria-disabled="true">ЗАПРОСИТЬ КОНФИГУРАЦИЮ ↗</button>
        </aside>

        <div className="equipmentLabList">
          {equipment.map((item, index) => (
            <div
              className="equipmentLabRow placeholderRow"
              key={item.code}
              role="button"
              tabIndex={0}
              aria-disabled="true"
              data-reveal
              data-equipment-index={index}
            >
              <span className="equipmentLabIndex">{item.index}</span>
              <span className="equipmentLabCode">{item.code}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <small>{item.signal}</small>
              <b aria-hidden="true">↗</b>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
