import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { equipment } from "@/data/site";

export const metadata: Metadata = {
  title: "Оборудование — Telemetry Systems",
  description: "Каталог модулей и систем для буровой телеметрии: инклинометрия, гамма, резистивиметрия, MWD, питание, ВЗД, наземное оборудование и ПО.",
};

export default function EquipmentPage() {
  return (
    <main>
      <Header />
      <section className="catalogHero sectionGrid pageEnter">
        <div className="sectionIndex">[ CATALOG ]</div>
        <div className="catalogHeroCopy">
          <p className="eyebrow" data-scramble data-scramble-text="DOWNHOLE / SURFACE / SOFTWARE">DOWNHOLE / SURFACE / SOFTWARE</p>
          <h1>Оборудование<br />и системы.</h1>
          <p>Модульная архитектура телеметрии: от ориентационных и геофизических измерений на забое до декодирования и рабочего места инженера на поверхности.</p>
        </div>
        <div className="catalogHeroMeta">
          <span>08 PRODUCT CLASSES</span>
          <span>MWD / LWD / BHA / SURFACE</span>
          <span>REV / 01</span>
        </div>
      </section>

      <section className="catalogGrid sectionGrid">
        <div className="catalogCards">
          {equipment.map((item) => (
            <Link className="catalogCard" href={`/equipment/${item.slug}`} key={item.code} data-reveal>
              <div className="catalogCardTop">
                <span>{item.index}</span>
                <strong>{item.code}</strong>
                <span>{item.category}</span>
              </div>
              <div className="catalogCardVisual" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="catalogCardBottom">
                <h2>{item.title}</h2>
                <p>{item.text}</p>
                <div><span>{item.signal}</span><b>↗</b></div>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}
