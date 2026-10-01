import { AlphaVideo } from "@/components/media/AlphaVideo";
import { AnchorLink } from "@/components/layout/AnchorLink";
import { PixelReveal } from "@/components/pixel/PixelReveal";
import { PixelText } from "@/components/pixel/PixelText";
import { SectionHead } from "@/components/sections/SectionHead";
import { openBay, services, slots, works } from "@/data/home";

const pad = (n: number) => String(n).padStart(2, "0");
const open = slots.length - works.length;

/**
 * 02: what we build, drawn as a text-mode screen. The three directions are
 * the rows of one double-ruled menu window (a row inverts under the pointer
 * like a selection bar); the works are cartridges with a printed label
 * sticker, sitting in their slots, and the open slots wait empty.
 */
export function Works() {
  return (
    <section className="block programs" id="works" aria-label="Что мы делаем" data-scene>
      <SectionHead
        index="02"
        label="WHAT WE BUILD / 3 DIRECTIONS"
        title={["Сайты, 3D", "и приложения"]}
        lead="Ведём продукт от идеи до запуска: дизайн, разработка, 3D и данные в реальном времени. Каждое направление подтверждено работающим проектом."
      />

      <div className="tuiWin">
        <p className="tuiWinBar" aria-hidden="true">
          <span>DIRECTIONS</span>
        </p>
        <ol className="serviceList" data-services>
          {services.map((service, index) => (
            <li className="service" id={service.id} key={service.id} data-service>
              <AnchorLink className="serviceRow" to={service.proof.to}>
                <span className="serviceNo">{pad(index + 1)}</span>
                <PixelText className="serviceCode" text={service.code} grid={false} />
                <div className="serviceText">
                  <h3>{service.title}</h3>
                  <span className="serviceLine">{service.text}</span>
                </div>
                <span className="servicePoints">
                  {service.points.map((point) => (
                    <span key={point}>{point}</span>
                  ))}
                </span>
                <span className="serviceProof">
                  {service.proof.label} <span aria-hidden="true">↓</span>
                </span>
              </AnchorLink>
            </li>
          ))}
        </ol>
      </div>

      <p className="worksLabel">
        <span>РАБОТЫ</span>
        <i aria-hidden="true" />
        <span>
          {pad(works.length)} LIVE / {pad(open)} OPEN
        </span>
      </p>

      <div className="bay">
        {works.map((work, index) => (
          <article className="cart" id={work.id} key={work.id} data-program-card data-cart>
            <div className="cartShell">
              <p className="cartGrip">
                <span>SLOT {pad(index + 1)}</span>
                <i aria-hidden="true" />
                <span className="cartLed" data-cart-led>
                  LIVE
                </span>
              </p>
              <div className="cartLabel">
                <p className="cartTop">
                  <span>{work.index}</span>
                  <span>{work.kicker}</span>
                </p>
                <PixelReveal className="cartMedia" cols={12} rows={8}>
                  <AlphaVideo id={work.media} />
                </PixelReveal>
                <h3>{work.title}</h3>
                <p className="cartText">{work.text}</p>
                <p className="cartTags">
                  {work.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </p>
              </div>
              <p className="workActions">
                <AnchorLink className="btn btnPx" to={work.caseId}>
                  Смотреть <span aria-hidden="true">↓</span>
                </AnchorLink>
                <a className="textBtn" href={work.href} target="_blank" rel="noopener noreferrer">
                  {work.hrefLabel} ↗
                </a>
              </p>
              <span className="cartPins" aria-hidden="true" />
            </div>
          </article>
        ))}
      </div>

      {open > 0 ? (
        <aside className="bayOpen" data-offer>
          <div className="bayMouths" aria-hidden="true">
            {Array.from({ length: open }, (_, index) => (
              <span className="bayMouth" key={index}>
                <b>{pad(works.length + index + 1)}</b>
                <i />
              </span>
            ))}
          </div>
          <div className="bayCopy">
            <p className="offerTag">
              <span aria-hidden="true">&gt;</span> <span data-offer-tag>{openBay.tag}</span>
            </p>
            <p className="offerText" data-offer-text>
              {openBay.text}
            </p>
          </div>
          <AnchorLink className="btn btnPx" to="request" data-offer-cta>
            Обсудить проект <span aria-hidden="true">↓</span>
          </AnchorLink>
        </aside>
      ) : null}
    </section>
  );
}
