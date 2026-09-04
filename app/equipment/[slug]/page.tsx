import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { equipment, equipmentByCode, equipmentBySlug, equipmentProfiles } from "@/data/site";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return equipment.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = equipmentBySlug[slug];
  if (!item) return {};

  return {
    title: `${item.title} — Telemetry Systems`,
    description: item.overview,
  };
}

export default async function EquipmentDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const item = equipmentBySlug[slug];
  if (!item) notFound();

  const currentIndex = equipment.findIndex((candidate) => candidate.slug === item.slug);
  const nextItem = equipment[(currentIndex + 1) % equipment.length];
  const compatible = item.compatibility.map((code) => equipmentByCode[code]).filter(Boolean);
  const profile = equipmentProfiles[item.code];

  return (
    <main>
      <Header />
      <article className="productPage pageEnter">
        <section className="productHero sectionGrid">
          <div className="sectionIndex">[ {item.index} ]</div>
          <div className="productHeroCopy">
            <p className="eyebrow" data-scramble data-scramble-text={item.category}>{item.category}</p>
            <span className="productCode">{item.code}</span>
            <h1>{item.shortTitle}</h1>
            <p className="productLead">{item.overview}</p>
            <div className="productHeroActions">
              <Link className="primaryAction" href={`/request?product=${item.code}`}>Запросить ТКП ↗</Link>
              <Link className="textLink" href="/equipment">← Все оборудование</Link>
            </div>
          </div>
          <div className="productVisual" aria-label={`Визуальный placeholder: ${item.heroLabel}`}>
            <span>{item.heroLabel}</span>
            <div className="productTool">
              <i /><i /><i className="isAccent" /><i /><i />
            </div>
            <div className="productAxis" />
            <div className="productSignal">{item.signal}</div>
          </div>
        </section>

        <section className="productIntro sectionGrid">
          <div className="sectionIndex">[ A ]</div>
          <div className="productSectionTitle" data-reveal>
            <p className="eyebrow">SYSTEM ROLE</p>
            <h2>Что делает<br />этот модуль.</h2>
          </div>
          <div className="capabilityList">
            {item.capabilities.map((capability, index) => (
              <div className="capabilityRow" key={capability} data-reveal>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{capability}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="productSpecs sectionGrid">
          <div className="sectionIndex">[ B ]</div>
          <div className="productSectionTitle" data-reveal>
            <p className="eyebrow">TECHNICAL CHARACTERISTICS</p>
            <h2>Технический<br />контур.</h2>
            <p className="specDisclaimer">Пока это уровень архитектуры класса оборудования. Точные числовые диапазоны, температура, давление, диаметр и точность будут внесены после утверждения конкретных моделей.</p>
          </div>
          <div className="specTable" data-reveal>
            {item.specs.map((spec) => (
              <div className="specRow" key={spec.label}>
                <span>{spec.label}</span>
                <strong>{spec.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="signalArchitecture sectionGrid">
          <div className="sectionIndex">[ C ]</div>
          <div className="productSectionTitle" data-reveal>
            <p className="eyebrow">SIGNAL ARCHITECTURE</p>
            <h2>Путь<br />данных.</h2>
          </div>
          <div className="signalPath" data-reveal>
            {item.signalPath.map((step, index) => (
              <div className="signalNode" key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{step}</strong>
                {index < item.signalPath.length - 1 && <i aria-hidden="true">→</i>}
              </div>
            ))}
          </div>
        </section>

        {profile && (
          <section className="productApplications sectionGrid">
            <div className="sectionIndex">[ D ]</div>
            <div className="productSectionTitle" data-reveal>
              <p className="eyebrow">APPLICATION / INTERFACES</p>
              <h2>Где и как<br />встраивается.</h2>
            </div>
            <div className="applicationGrid">
              <div className="applicationColumn" data-reveal>
                <span className="eyebrow">TYPICAL USE</span>
                {profile.applications.map((application, index) => (
                  <div className="applicationRow" key={application}><span>{String(index + 1).padStart(2, "0")}</span><strong>{application}</strong></div>
                ))}
              </div>
              <div className="interfaceMatrix" data-reveal>
                <span className="eyebrow">INTERFACE MATRIX</span>
                {profile.interfaces.map((entry) => (
                  <div className="interfaceRow" key={entry.label}><span>{entry.label}</span><strong>{entry.value}</strong></div>
                ))}
              </div>
            </div>
          </section>
        )}

        {profile && (
          <section className="deployment sectionGrid">
            <div className="sectionIndex">[ E ]</div>
            <div className="productSectionTitle" data-reveal>
              <p className="eyebrow">DEPLOYMENT NOTES</p>
              <h2>Инженерные<br />ограничения.</h2>
            </div>
            <div className="deploymentList">
              {profile.deploymentNotes.map((note, index) => (
                <div className="deploymentRow" key={note} data-reveal><span>{String(index + 1).padStart(2, "0")}</span><p>{note}</p></div>
              ))}
            </div>
          </section>
        )}

        <section className="compatibility sectionGrid">
          <div className="sectionIndex">[ F ]</div>
          <div className="productSectionTitle" data-reveal>
            <p className="eyebrow">SYSTEM COMPATIBILITY</p>
            <h2>Собирается<br />в систему.</h2>
          </div>
          <div className="compatibilityGrid">
            {compatible.map((candidate) => (
              <Link href={`/equipment/${candidate.slug}`} className="compatibilityCard" key={candidate.code} data-reveal>
                <span>{candidate.code}</span>
                <strong>{candidate.shortTitle}</strong>
                <small>{candidate.category}</small>
                <b>↗</b>
              </Link>
            ))}
          </div>
        </section>

        <section className="productNext sectionGrid">
          <div className="sectionIndex">[ NEXT ]</div>
          <div className="productNextLabel">NEXT MODULE / {nextItem.code}</div>
          <Link href={`/equipment/${nextItem.slug}`} className="productNextLink">
            <span>{nextItem.shortTitle}</span>
            <b>↗</b>
          </Link>
        </section>
      </article>
      <Footer />
    </main>
  );
}
