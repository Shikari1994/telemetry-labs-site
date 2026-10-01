import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Mascot } from "@/components/mascot/Mascot";
import { TransitScene } from "@/components/motion/TransitScene";
import { SectionRail } from "@/components/layout/SectionRail";
import { SignalBus } from "@/components/layout/SignalBus";
import { PartnerTicker } from "@/components/sections/PartnerTicker";
import { WorksIndex } from "@/components/sections/WorksIndex";
import { Hero } from "@/components/sections/Hero";
import { Works } from "@/components/sections/Works";
import { CaseSite } from "@/components/sections/CaseSite";
import { CaseMonitor } from "@/components/sections/CaseMonitor";
import { Screens } from "@/components/sections/Screens";
import { Stack } from "@/components/sections/Stack";
import { NextStage } from "@/components/sections/NextStage";
import { Transit } from "@/components/sections/Transit";
import { Seam } from "@/components/sections/Seam";

export default function Home() {
  return (
    <main className="home">
      <Header />
      <Hero />
      <Transit to="works" />
      <PartnerTicker />
      <WorksIndex />

      {/* Reference grid: a sticky TREE rail in the first third, the narrative
          in the remaining two thirds. The signal bus runs down the gutter
          between them. Three transits cross the 3D board (Transit +
          TransitScene), each moving the camera its own way: a flight in from
          the hero, a bore down into Drill Monitor, a rise over the whole
          board before the request. Between the other sections a quiet seam
          on the same grid hands over to the next head. */}
      <div className="homeFrame">
        <SignalBus />
        <SectionRail />
        <div className="homeFlow" data-home-flow>
          <Works />
          <Seam to="case-site" />
          <CaseSite />
          <Transit to="drill-monitor" />
          {/* Drill Monitor and its screens are one story: no seam between. */}
          <CaseMonitor />
          <Screens />
          <Seam to="stack" />
          <Stack />
          <Transit to="request" />
          <NextStage />
        </div>
      </div>

      <Footer />
      <TransitScene />
      <Mascot />
    </main>
  );
}
