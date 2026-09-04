import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { RfqForm } from "@/components/forms/RfqForm";

export const metadata: Metadata = {
  title: "Запросить ТКП — Telemetry Systems",
  description: "Форма технического запроса на подбор буровой телеметрии, LWD/MWD-модулей, ВЗД, наземного оборудования и ПО.",
};

export default function RequestPage() {
  return (
    <main>
      <Header />
      <section className="requestHero sectionGrid pageEnter">
        <div className="sectionIndex">[ RFQ ]</div>
        <div className="requestHeroCopy">
          <p className="eyebrow" data-scramble data-scramble-text="REQUEST / CONFIGURE / INTEGRATE">REQUEST / CONFIGURE / INTEGRATE</p>
          <h1>Запросить<br />ТКП.</h1>
        </div>
        <div className="requestHeroAside">
          <span>ENGINEERING INPUT</span>
          <p>Опишите задачу и выберите интересующие узлы. Структура формы уже готова под реальный backend/CRM.</p>
        </div>
      </section>
      <section className="requestBody sectionGrid">
        <div className="sectionIndex">[ 01—03 ]</div>
        <div className="requestFormWrap">
          <RfqForm />
        </div>
      </section>
      <Footer />
    </main>
  );
}
