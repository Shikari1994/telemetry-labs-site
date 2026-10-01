import type { CSSProperties } from "react";
import { AlphaVideo } from "@/components/media/AlphaVideo";
import { SectionHead } from "@/components/sections/SectionHead";
import { SectionOffer } from "@/components/sections/SectionOffer";
import { SITE_URL, monitorLayers } from "@/data/home";

/**
 * Case 02: Drill Monitor as an isometric stack of CSS 3D slabs, rig at the
 * bottom and the screens on top. Scrolling pulls the layers apart and turns
 * the stack; packets rise through a beam from the rig to the screens. The
 * list beside it lights up layer by layer on the same scrub.
 */
export function CaseMonitor() {
  const top = monitorLayers.length - 1;
  return (
    <section className="block monitor" id="drill-monitor" data-scene>
      <SectionHead
        index="04"
        label="CASE 02 / DRILL MONITOR / PLATFORM"
        title={["Drill Monitor:", "бурение онлайн"]}
        lead="Бурение, траектория, каротаж и паспорта оборудования — в одной системе вместо разрозненных программ и таблиц. В офисе на компьютере и в телефоне у скважины."
      >
        <p className="blockAside">
          <a className="textBtn" href={`${SITE_URL}#software`} target="_blank" rel="noopener noreferrer">
            Демо на geo-tn.com ↗
          </a>
        </p>
      </SectionHead>

      <div className="layers">
        <div className="tuiWin layersWin">
          <p className="tuiWinBar" aria-hidden="true">
            <span>RIG → SCREEN</span>
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
      <SectionOffer offer="monitor" />
    </section>
  );
}
