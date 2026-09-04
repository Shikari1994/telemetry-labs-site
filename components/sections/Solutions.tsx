import { solutions } from "@/data/solutions";

const metrics: Record<string, [string, string, string]> = {
  MWD: ["5", "LIVE CHANNELS", "REAL-TIME"],
  LWD: ["7", "DATA LAYERS", "FORMATION"],
  DATA: ["24/7", "REMOTE VIEW", "SURFACE"],
};

export function Solutions() {
  return (
    <section className="systemsShowcase" id="solutions">
      <div className="systemsPin">
        <div className="systemsShowcaseHeader">
          <span>[ 04 ]</span>
          <div>
            <p className="eyebrow" data-scramble data-scramble-text="SYSTEM ARCHITECTURES / FIELD CONFIGURATIONS">SYSTEM ARCHITECTURES / FIELD CONFIGURATIONS</p>
            <h2 data-reveal>СИСТЕМЫ<br />НА ОБЪЕКТЕ.</h2>
          </div>
          <div className="systemsHeaderMeta">
            <span>03 CONFIGURATIONS</span>
            <button className="textLink uiPlaceholder" type="button" aria-disabled="true">ВСЕ РЕШЕНИЯ ↗</button>
          </div>
        </div>

        <div className="systemsViewport">
          <div className="systemsRail" aria-label="Примеры системных архитектур">
            {solutions.map((solution, index) => {
              const metric = metrics[solution.code] ?? ["—", "SYSTEM", "ENGINEERING"];
              return (
                <article className="systemCard" key={solution.slug}>
                  <div className="systemCardVisual" aria-hidden="true">
                    <span>{solution.index}</span>
                    <div className="systemCardSchematic">
                      {solution.architecture.slice(0, 5).map((node) => <i key={node.code} />)}
                    </div>
                    <strong>{solution.code}</strong>
                    <small>FIELD / {String(index + 1).padStart(2, "0")}</small>
                  </div>
                  <div className="systemCardMeta">
                    <span>{solution.eyebrow}</span>
                    <h3>{solution.title}</h3>
                    <p>{solution.summary}</p>
                  </div>
                  <div className="systemCardMetrics">
                    <div><strong>{metric[0]}</strong><span>{metric[1]}</span></div>
                    <div><strong>{metric[2]}</strong><span>MODE</span></div>
                    <div><strong>{solution.equipmentCodes.length}</strong><span>MODULES</span></div>
                  </div>
                  <button className="systemCardAction uiPlaceholder" type="button" aria-disabled="true">ОТКРЫТЬ СИСТЕМУ ↗</button>
                </article>
              );
            })}
            <article className="systemCard systemCardEnd" aria-hidden="true">
              <div className="systemCardEndInner"><span>END / 03</span><strong>FULL<br />SYSTEM<br />STACK.</strong></div>
            </article>
          </div>
        </div>

        <div className="systemsScrollHint" aria-hidden="true"><span>SCROLL TO EXPLORE</span><i /></div>
      </div>
    </section>
  );
}
