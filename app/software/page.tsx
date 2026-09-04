import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Drill Monitor — Telemetry Systems",
  description: "ПО для удалённого мониторинга бурения, телеметрии и план/факт траектории.",
};

const channels = [
  ["INC", "87.42°"], ["AZM", "126.18°"], ["TF", "314.6°"], ["GR", "92 API"], ["TEMP", "118°C"], ["PRES", "64 MPa"],
];

export default function SoftwarePage() {
  return (
    <main>
      <Header />
      <section className="softwareHero sectionGrid pageEnter">
        <div className="sectionIndex">[ SW ]</div>
        <div className="softwareHeroCopy">
          <p className="eyebrow">REMOTE DRILLING MONITORING</p>
          <span className="productCode">DRILL MONITOR</span>
          <h1>Данные бурения.<br />В одном контуре.</h1>
          <p>Рабочее приложение для телеметрии, наземных каналов, план/факт траектории, событий и контроля качества сигнала.</p>
          <div className="productHeroActions">
            <Link href="/request?product=SW" className="primaryAction">Запросить демонстрацию ↗</Link>
            <Link href="/equipment/software" className="textLink">Техническая карточка</Link>
          </div>
        </div>
        <div className="softwareHeroReadings">
          {channels.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </div>
      </section>

      <section className="softwareWorkspace sectionGrid">
        <div className="sectionIndex">[ 01 ]</div>
        <div className="workspaceWindow" data-reveal>
          <div className="workspaceTop"><span>DRILL MONITOR / LIVE SESSION</span><span>LINK // STABLE</span></div>
          <div className="workspaceBody">
            <aside>
              <b>WELL</b><strong>BH-042</strong>
              <b>MD</b><strong>3248.6 m</strong>
              <b>TVD</b><strong>1712.4 m</strong>
              <b>STATE</b><strong>DRILLING</strong>
            </aside>
            <div className="workspaceTrajectory">
              <div className="workspaceHud"><span>PLAN / ACTUAL</span><span>3D TRAJECTORY PLACEHOLDER</span></div>
              <svg viewBox="0 0 800 420" role="img" aria-label="Условная план/факт траектория">
                <path className="chartGrid" d="M0 70H800M0 140H800M0 210H800M0 280H800M0 350H800M100 0V420M200 0V420M300 0V420M400 0V420M500 0V420M600 0V420M700 0V420" />
                <path className="trajectoryPlan" d="M40 35 C170 50 160 160 300 205 S540 220 740 360" />
                <path className="trajectoryFact" d="M40 35 C180 55 145 175 315 215 S535 205 746 345" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section className="softwareFeatureGrid sectionGrid">
        <div className="sectionIndex">[ 02 ]</div>
        <div className="featureGrid">
          {[
            ["01", "LIVE TELEMETRY", "Забойные и наземные каналы в единой временной модели."],
            ["02", "PLAN / ACTUAL", "Контроль фактической траектории относительно проектной."],
            ["03", "SIGNAL QUALITY", "Состояние декодирования, потери кадров и диагностические признаки."],
            ["04", "EVENTS", "События и инженерные отметки без потери контекста по времени и глубине."],
            ["05", "REMOTE", "Архитектура под удалённый просмотр и инженерное сопровождение."],
            ["06", "ARCHIVE", "История сеанса для анализа, отчётности и последующего разбора."],
          ].map(([index, title, text]) => (
            <div className="featureCell" key={index} data-reveal><span>{index}</span><strong>{title}</strong><p>{text}</p></div>
          ))}
        </div>
      </section>

      <section className="softwarePipeline sectionGrid">
        <div className="sectionIndex">[ 03 ]</div>
        <div className="productSectionTitle" data-reveal><p className="eyebrow">DATA PIPELINE</p><h2>Сигнал не<br />теряет контекст.</h2></div>
        <div className="architectureRail">
          {[
            ["01", "DECODER", "Приём восстановленного телеметрического потока."],
            ["02", "SURFACE", "Добавление наземных параметров и глубины."],
            ["03", "SYNC", "Сведение каналов по времени и состоянию."],
            ["04", "UI", "Визуализация телеметрии и траектории."],
            ["05", "ARCHIVE", "Сохранение истории и событий."],
          ].map(([code, label, detail], index) => (
            <div className="architectureNode" key={code} data-reveal><span>{code}</span><strong>{label}</strong><p>{detail}</p>{index < 4 && <i>→</i>}</div>
          ))}
        </div>
      </section>
      <Footer />
    </main>
  );
}
