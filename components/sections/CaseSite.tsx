import type { CSSProperties } from "react";
import { AlphaVideo } from "@/components/media/AlphaVideo";
import { CasePassport } from "@/components/sections/CasePassport";
import { SectionHead } from "@/components/sections/SectionHead";
import { SectionOffer } from "@/components/sections/SectionOffer";
import { SITE_URL, siteShowcase } from "@/data/home";

const STEP = 360 / siteShowcase.length;
const total = String(siteShowcase.length).padStart(2, "0");

/**
 * Case 01: the opener and passport say what the site is and who it is for,
 * then come its features: the geo-tn.com captures hung on one 3D ring, every
 * one in its own colours. Screens turned away sink into the dark (--lit,
 * written by the scrub); the one in front takes its line of copy. Scrolling
 * turns the ring a screen at a time (MotionProvider pins it on desktop). The
 * markup ships the ring at rest, so reduced motion reads the same.
 */
export function CaseSite() {
  return (
    <section className="block showcase" id="case-site" data-ring>
      <div className="ringPin" data-ring-pin>
        <SectionHead
          index="03"
          label="CASE 01 / GEO-TN.COM / SHOWCASE"
          title={["Сайт, который", "рассказывает"]}
          lead="Компания, её приборы и собственная программа — одной историей на прокрутке."
        >
          <p className="blockAside">
            <a className="textBtn" href={SITE_URL} target="_blank" rel="noopener noreferrer">
              geo-tn.com ↗
            </a>
          </p>
          <CasePassport work="site" />
        </SectionHead>

        <div className="ringStage" data-ring-stage>
          <div className="ringCam" data-ring-cam>
            <div className="ringFloor" aria-hidden="true">
              <i data-ring-dial />
            </div>
            <div className="ring" data-ring-spin style={{ "--step": `${STEP}deg` } as CSSProperties}>
              {siteShowcase.map((item, index) => (
                <figure
                  className={`ringCard${index === 0 ? " is-front" : ""}`}
                  key={item.slug}
                  data-ring-card
                  style={
                    {
                      "--i": index,
                      "--lit": ((1 + Math.cos((index * STEP * Math.PI) / 180)) / 2).toFixed(3),
                    } as CSSProperties
                  }
                >
                  <AlphaVideo id={item.shot} />
                  <span className="ringShade" aria-hidden="true" />
                  <span className="ringHud" aria-hidden="true" />
                  <figcaption className="ringTag">{item.code}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>

        <div className="ringInfo">
          <ol className="ringList">
            {siteShowcase.map((item, index) => (
              <li className={index === 0 ? "is-active" : undefined} key={item.slug} data-ring-item>
                <span className="ringNo">
                  {item.code} / {total}
                </span>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </li>
            ))}
          </ol>
          <p className="ringMeter" aria-hidden="true">
            {siteShowcase.map((item, index) => (
              <i className={index === 0 ? "is-on" : undefined} key={item.slug} data-ring-tick />
            ))}
          </p>
        </div>
      </div>
      <SectionOffer offer="site" />
    </section>
  );
}
