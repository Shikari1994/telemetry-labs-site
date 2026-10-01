import type { CSSProperties } from "react";
import { AlphaVideo } from "@/components/media/AlphaVideo";
import { CasePassport } from "@/components/sections/CasePassport";
import { SectionHead } from "@/components/sections/SectionHead";
import { SITE_URL, monitorLayers } from "@/data/home";

/**
 * Case 02 opens here: what Drill Monitor is, its passport, and where it
 * works, drawn as an isometric stack of CSS 3D slabs, the rig at the bottom
 * and the office on top. Scrolling pulls the layers apart and turns the
 * stack; packets rise through a beam from the rig up. The list beside it
 * lights up layer by layer on the same scrub. The features follow in 05, and
 * the case's one offer closes 05.
 */
export function CaseMonitor() {
  const top = monitorLayers.length - 1;
  return (
    <section className="block monitor" id="drill-monitor" data-scene>
      <SectionHead
        index="04"
        label="CASE 02 / DRILL MONITOR / PLATFORM"
        title={["Drill Monitor:", "бурение онлайн"]}
        lead="Программа, которую показывает geo-tn.com: бурение в реальном времени и цифровой паспорт каждого прибора."
      >
        <p className="blockAside">
          <a className="textBtn" href={`${SITE_URL}#software`} target="_blank" rel="noopener noreferrer">
            Демо на geo-tn.com ↗
          </a>
        </p>
        <CasePassport work="monitor" />
      </SectionHead>

      <div className="layers">
        <div className="tuiWin layersWin">
          <p className="tuiWinBar" aria-hidden="true">
            <span>RIG → FIELD · OFFICE</span>
          </p>
          <div className="layersStage" data-monitor>
            <div className="layersView" aria-hidden="true">
              <div className="layersIso" data-layers-iso>
                {monitorLayers.map((layer, index) => (
                  <div
                    className={`slab slab-${layer.tier.toLowerCase()}`}
                    key={layer.tier}
                    data-slab
                    style={{ "--i": index } as CSSProperties}
                  >
                    <div className="slabTop">
                      {index === top ? <AlphaVideo id="dm-drilling" /> : null}
                      <span>{layer.tier}</span>
                    </div>
                    <div className="slabFront" />
                    <div className="slabRight" />
                  </div>
                ))}
                <div className="beam">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </div>
          </div>
        </div>

        <ol className="layerList">
          {/* Read top-down, as the stack is seen: screens first, rig last. */}
          {monitorLayers
            .map((layer, index) => ({ layer, index }))
            .reverse()
            .map(({ layer, index }) => (
              <li key={layer.tier} data-layer={index}>
                <span className="layerNo">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <p className="layerTier">{layer.tier}</p>
                  <strong>{layer.title}</strong>
                  <p>{layer.text}</p>
                </div>
              </li>
            ))}
        </ol>
      </div>
    </section>
  );
}
