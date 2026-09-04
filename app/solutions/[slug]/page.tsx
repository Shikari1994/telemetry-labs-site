import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { solutions, solutionsBySlug } from "@/data/solutions";
import { equipmentByCode } from "@/data/site";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return solutions.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const solution = solutionsBySlug[slug];
  if (!solution) return {};
  return { title: `${solution.title} — Telemetry Systems`, description: solution.summary };
}

export default async function SolutionDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const solution = solutionsBySlug[slug];
  if (!solution) notFound();

  const index = solutions.findIndex((item) => item.slug === solution.slug);
  const next = solutions[(index + 1) % solutions.length];
  const modules = solution.equipmentCodes.map((code) => equipmentByCode[code]).filter(Boolean);

  return (
    <main>
      <Header />
      <article className="solutionDetail pageEnter">
        <section className="solutionHero sectionGrid">
          <div className="sectionIndex">[ {solution.index} ]</div>
          <div className="solutionHeroCopy">
            <p className="eyebrow">{solution.eyebrow}</p>
            <span className="productCode">{solution.code}</span>
            <h1>{solution.title}</h1>
            <p>{solution.summary}</p>
            <Link className="primaryAction" href="/request">Обсудить конфигурацию ↗</Link>
          </div>
          <div className="solutionHeroRail" aria-hidden="true">
            {solution.architecture.map((node, nodeIndex) => (
              <div className="solutionMiniNode" key={node.code}>
                <span>{node.code}</span>
                <strong>{node.label}</strong>
                {nodeIndex < solution.architecture.length - 1 && <i>↓</i>}
              </div>
            ))}
          </div>
        </section>

        <section className="solutionObjective sectionGrid">
          <div className="sectionIndex">[ A ]</div>
          <div className="productSectionTitle" data-reveal>
            <p className="eyebrow">ENGINEERING OBJECTIVE</p>
            <h2>Что должна<br />решать система.</h2>
          </div>
          <p className="solutionObjectiveText" data-reveal>{solution.objective}</p>
        </section>

        <section className="solutionArchitecture sectionGrid">
          <div className="sectionIndex">[ B ]</div>
          <div className="productSectionTitle" data-reveal>
            <p className="eyebrow">SYSTEM ARCHITECTURE</p>
            <h2>От забоя<br />до решения.</h2>
          </div>
          <div className="architectureRail">
            {solution.architecture.map((node, nodeIndex) => (
              <div className="architectureNode" key={node.code} data-reveal>
                <span>{node.code}</span>
                <strong>{node.label}</strong>
                <p>{node.detail}</p>
                {nodeIndex < solution.architecture.length - 1 && <i>→</i>}
              </div>
            ))}
          </div>
        </section>

        <section className="solutionModules sectionGrid">
          <div className="sectionIndex">[ C ]</div>
          <div className="productSectionTitle" data-reveal>
            <p className="eyebrow">SYSTEM COMPONENTS</p>
            <h2>Состав<br />решения.</h2>
          </div>
          <div className="compatibilityGrid">
            {modules.map((module) => (
              <Link href={`/equipment/${module.slug}`} className="compatibilityCard" key={module.code} data-reveal>
                <span>{module.code}</span>
                <strong>{module.shortTitle}</strong>
                <small>{module.category}</small>
                <b>↗</b>
              </Link>
            ))}
          </div>
        </section>

        <section className="solutionOutputs sectionGrid">
          <div className="sectionIndex">[ D ]</div>
          <div className="solutionOutputColumn" data-reveal>
            <p className="eyebrow">OUTPUTS</p>
            <h2>На выходе.</h2>
            {solution.outputs.map((item, itemIndex) => <div className="outputRow" key={item}><span>{String(itemIndex + 1).padStart(2, "0")}</span><strong>{item}</strong></div>)}
          </div>
          <div className="solutionOutputColumn" data-reveal>
            <p className="eyebrow">USE CASES</p>
            <h2>Где работает.</h2>
            {solution.useCases.map((item, itemIndex) => <div className="outputRow" key={item}><span>{String(itemIndex + 1).padStart(2, "0")}</span><strong>{item}</strong></div>)}
          </div>
        </section>

        <section className="productNext sectionGrid">
          <div className="sectionIndex">[ NEXT ]</div>
          <div className="productNextLabel">NEXT SOLUTION / {next.code}</div>
          <Link href={`/solutions/${next.slug}`} className="productNextLink"><span>{next.title}</span><b>↗</b></Link>
        </section>
      </article>
      <Footer />
    </main>
  );
}
