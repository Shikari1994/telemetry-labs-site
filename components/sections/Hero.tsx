import { AnchorLink } from "@/components/layout/AnchorLink";
import { PixelText } from "@/components/pixel/PixelText";
import { HeroRoom } from "@/components/sections/HeroRoom";
import { heroReadings, works } from "@/data/home";

export function Hero() {
  return (
    <section className="hero" id="top" data-hero-section>
      <h1 className="heroWordmark" aria-label="АЛЬФА КОД — портфолио">
        {/* One line on wide screens, two stacked lines on phones. */}
        <span className="heroWordmarkWide" data-hero-word>
          <PixelText text="АЛЬФА КОД" />
        </span>
        <span className="heroWordmarkNarrow" data-hero-word>
          <PixelText text="АЛЬФА" />
          <PixelText text="КОД" />
        </span>
      </h1>

      <div className="heroGrid">
        <div className="heroCopy" data-hero-copy>
          <p className="chip" data-hero-line>
            Портфолио / работы
          </p>
          <p className="heroLead" data-hero-line>
            Сайты, 3D-визуализация и приложения для технологичных компаний — от корпоративного сайта до системы,
            которая показывает бурение в реальном времени.
          </p>

          <dl className="heroMeta" data-hero-line>
            <div>
              <dt>ФОКУС</dt>
              <dd>
                <span className="br">└</span> Инженерные продукты
              </dd>
            </div>
            <div>
              <dt>СТАТУС</dt>
              <dd>
                <span className="br">└</span> Online <span className="caret" aria-hidden="true" />
              </dd>
            </div>
            <div>
              <dt>ИНДЕКС</dt>
              <dd>
                <span className="br">└</span> {works.map((work) => `${work.index} ${work.title}`).join(" · ")}
              </dd>
            </div>
          </dl>

          <div className="heroActions" data-hero-line>
            <AnchorLink className="btn btnSolid" to="works">
              Смотреть работы <span aria-hidden="true">↘</span>
            </AnchorLink>
            <span className="heroKeys">
              <span className="keyHint">[S]</span> индекс работ
            </span>
          </div>
        </div>

        <figure className="heroFigure" data-hero-object>
          <HeroRoom />
          <figcaption className="figCaption" data-hero-line>
            <span>FIG. 01</span>
            <span>Галерея работ: плакат открывает кейс</span>
            <span className="heroCaptionLive">
              <i aria-hidden="true" /> 02 WORKS / ONLINE
            </span>
          </figcaption>

          <div className="heroReadings" aria-label="Портфолио в цифрах" data-hero-line>
            {heroReadings.map(([label, value]) => (
              <div className="heroReading" key={label}>
                <span>{label}</span>
                <strong data-scramble-value>{value}</strong>
              </div>
            ))}
          </div>
        </figure>
      </div>
    </section>
  );
}
