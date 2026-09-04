import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { solutions } from "@/data/solutions";
import { equipmentByCode } from "@/data/site";

export const metadata: Metadata = {
  title: "Решения — Telemetry Systems",
  description: "Архитектуры для направленного бурения, LWD-геонавигации и удалённого мониторинга телеметрии.",
};

export default function SolutionsPage() {
  return (
    <main>
      <Header />
      <section className="catalogHero sectionGrid pageEnter">
        <div className="sectionIndex">[ SOLUTIONS ]</div>
        <div className="catalogHeroCopy">
          <p className="eyebrow" data-scramble data-scramble-text="BHA / TELEMETRY / DATA">BHA / TELEMETRY / DATA</p>
          <h1>Решения<br />как система.</h1>
          <p>Не отдельные приборы, а законченные инженерные контуры: измерение на забое, передача, наземный приём и программная визуализация.</p>
        </div>
        <div className="catalogHeroMeta">
          <span>03 SYSTEM ARCHETYPES</span>
          <span>DOWNHOLE → SURFACE → SOFTWARE</span>
          <span>REV / 01</span>
        </div>
      </section>

      <section className="solutionList sectionGrid">
        <div className="solutionCards">
          {solutions.map((solution) => (
            <Link href={`/solutions/${solution.slug}`} className="solutionCard" key={solution.slug} data-reveal>
              <div className="solutionCardIndex">{solution.index}</div>
              <div className="solutionCardCode">{solution.code}</div>
              <div className="solutionCardCopy">
                <span>{solution.eyebrow}</span>
                <h2>{solution.title}</h2>
                <p>{solution.summary}</p>
              </div>
              <div className="solutionCardModules">
                {solution.equipmentCodes.map((code) => (
                  <span key={code}>{equipmentByCode[code]?.shortTitle ?? code}</span>
                ))}
              </div>
              <b className="solutionCardArrow">↗</b>
            </Link>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}
