export function Software() {
  return (
    <section className="softwareLab" id="software">
      <div className="softwareLabHeader">
        <span>[ 06 ]</span>
        <div>
          <p className="eyebrow" data-scramble data-scramble-text="SURFACE / SOFTWARE / LIVE">SURFACE / SOFTWARE / LIVE</p>
          <h2 data-reveal>DRILL<br />MONITOR.</h2>
        </div>
        <div className="softwareLabCopy" data-reveal>
          <h3>Телеметрия заканчивается не на декодере.</h3>
          <p>Наземное ПО связывает глубину, траекторию, телеметрию, диагностику и события в одну временную модель.</p>
          <button className="textLink uiPlaceholder" type="button" aria-disabled="true">ПОДРОБНЕЕ О ПО ↗</button>
        </div>
      </div>

      <div className="monitorStage" data-reveal data-parallax="2">
        <div className="monitorWindow">
          <div className="monitorWindowTop">
            <span>DRILL MONITOR / DM-017</span>
            <span><i /> LIVE LINK 98.7%</span>
            <span>UTC+05 / 14:42:18</span>
          </div>
          <div className="monitorWindowBody">
            <aside className="monitorTelemetry">
              <div><span>MD</span><strong>3842.6</strong><small>m</small></div>
              <div><span>INC</span><strong>87.42</strong><small>°</small></div>
              <div><span>AZM</span><strong>126.18</strong><small>°</small></div>
              <div><span>GR</span><strong>92</strong><small>API</small></div>
            </aside>

            <div className="monitorTrajectory">
              <div className="monitorAxes"><span>N</span><span>PLAN / FACT</span><span>TVD</span></div>
              <svg viewBox="0 0 900 470" role="img" aria-label="Схематичная план-факт траектория">
                <path className="monitorGrid" d="M0 70H900M0 140H900M0 210H900M0 280H900M0 350H900M0 420H900M120 0V470M240 0V470M360 0V470M480 0V470M600 0V470M720 0V470M840 0V470" />
                <path className="monitorPlan" d="M80 64 C220 82 300 126 356 196 S490 346 808 408" />
                <path className="monitorFact" d="M80 64 C213 78 307 135 360 205 S515 332 818 386" />
              </svg>
              <div className="monitorCursor"><i /></div>
              <div className="monitorLegend"><span>— PLAN</span><strong>— FACT</strong></div>
            </div>

            <aside className="monitorEvents">
              <span>EVENT STREAM</span>
              <div><b>14:42:16</b><p>FRAME / VALID</p></div>
              <div><b>14:42:12</b><p>GR / 92 API</p></div>
              <div><b>14:42:08</b><p>TF / UPDATE</p></div>
              <div><b>14:42:03</b><p>LINK / STABLE</p></div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
