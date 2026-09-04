import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Инженерный подход — Telemetry Systems",
  description: "Подбор, интеграция, стендовая проверка и сопровождение телеметрических систем для бурения.",
};

const stages = [
  ["01", "INPUT", "Задача скважины", "Профиль, диаметр, КНБК, измерения, температурно-барические ограничения, требования к поверхности."],
  ["02", "CONFIG", "Архитектура системы", "Определяем набор забойных модулей, телеметрический канал, питание, наземный контур и ПО."],
  ["03", "INTERFACE", "Интеграция", "Фиксируем механические, электрические и программные границы между узлами."],
  ["04", "VERIFY", "Проверка", "Стендовые сценарии, диагностика каналов, проверка потока данных и отказоустойчивых состояний."],
  ["05", "DEPLOY", "Ввод в работу", "Конфигурация под объект, контроль первого сеанса и инженерная поддержка."],
];

export default function EngineeringPage() {
  return (
    <main>
      <Header />
      <section className="engineeringHero sectionGrid pageEnter">
        <div className="sectionIndex">[ ENG ]</div>
        <div className="engineeringHeroCopy">
          <p className="eyebrow">CONFIGURE / VERIFY / DEPLOY</p>
          <h1>Инженерия<br />до железа.</h1>
          <p>Сначала фиксируем задачу, интерфейсы и путь данных. Потом выбираем конкретные модули и численные характеристики.</p>
        </div>
        <div className="engineeringHeroMatrix" aria-hidden="true">
          <span>BHA</span><span>MWD</span><span>LWD</span><span>SURFACE</span><span>SOFTWARE</span><span>QA</span>
        </div>
      </section>

      <section className="engineeringProcess sectionGrid">
        <div className="sectionIndex">[ 01—05 ]</div>
        <div className="processRail">
          {stages.map(([index, code, title, text]) => (
            <div className="processStep" key={index} data-reveal>
              <span>{index}</span><small>{code}</small><h2>{title}</h2><p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="engineeringBoundary sectionGrid">
        <div className="sectionIndex">[ RULE ]</div>
        <div className="productSectionTitle" data-reveal><p className="eyebrow">DATA DISCIPLINE</p><h2>Не выдумываем<br />характеристики.</h2></div>
        <div className="boundaryCopy" data-reveal>
          <p>До появления паспорта конкретного изделия сайт показывает архитектуру класса оборудования, назначение, интерфейсы и совместимость. Температуру, давление, точность, частоты, расход, момент и другие численные параметры добавляем только из подтверждённой документации.</p>
          <Link href="/request" className="primaryAction">Передать исходные данные ↗</Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
