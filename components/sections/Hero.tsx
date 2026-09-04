import { AlphaVideo } from "@/components/media/AlphaVideo";
import { telemetryReadings } from "@/data/site";

export function Hero() {
  return (
    <section className="hero" id="top" data-hero-section>
      <div className="heroGridLines" aria-hidden="true"><i /><i /><i /></div>

      <div className="heroTopMeta" data-hero-meta>
        <span>DOWNHOLE TELEMETRY / DRILLING SYSTEMS</span>
        <span>LAT 53.45 / LINK STABLE</span>
      </div>

      <h1 className="heroTitle heroWordmark" aria-label="Telemetry Systems">
        <span className="heroTitleLine">
          <span className="heroBrandLockup" data-hero-word>
            <span className="heroBrandMark" aria-hidden="true">TS</span>
            <span className="heroBrandText">
              <span>TELEMETRY</span>
              <span>SYSTEMS</span>
            </span>
          </span>
        </span>
      </h1>

      <div className="heroObjectWrap" data-hero-object aria-hidden="true">
        <div className="heroObjectShadow" />
        <div className="heroProbe">
          <span className="heroProbeCorner c1" data-hero-corner />
          <span className="heroProbeCorner c2" data-hero-corner />
          <span className="heroProbeCorner c3" data-hero-corner />
          <span className="heroProbeCorner c4" data-hero-corner />
          {/* Hero-critical media: poster paints immediately, video attaches
              once the 3D pipeline delivers sources for this id. */}
          <AlphaVideo id="hero-probe" className="heroProbeMedia" priority />
        </div>
        <div className="heroObjectTag tagA">01 / SENSOR CORE</div>
        <div className="heroObjectTag tagB">DATA / LIVE</div>
      </div>

      <div className="heroCopy heroCopyLeft" data-hero-copy>
        <p>
          Системы измерения, передачи и интерпретации забойных данных — от положения КНБК до рабочего места инженера.
        </p>
        <button className="heroButton uiPlaceholder" type="button" aria-disabled="true" data-magnetic>
          ИССЛЕДОВАТЬ СИСТЕМУ <span>↘</span>
        </button>
      </div>

      <div className="heroCopy heroCopyRight" data-hero-copy>
        <span className="heroCopyIndex">/ 001</span>
        <p>
          Инклинометрия, гамма, резистивиметрия, MWD, ВЗД, наземный контур и Drill Monitor в одной инженерной архитектуре.
        </p>
      </div>

      <div className="heroCornerPanel" data-hero-meta>
        <div className="heroCornerGraphic">
          <i /><i /><i /><i /><i />
        </div>
        <div className="heroCornerCaption">
          <span>SIGNAL SAMPLE</span>
          <strong>98.7%</strong>
        </div>
      </div>

      <div className="heroReadings" data-hero-meta aria-label="Демонстрационные телеметрические показания">
        {telemetryReadings.map(([label, value]) => (
          <div className="heroReading" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
