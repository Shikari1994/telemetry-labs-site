import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SignalMarquee } from "@/components/motion/SignalMarquee";
import { PartnerTicker } from "@/components/sections/PartnerTicker";
import { NextStage } from "@/components/sections/NextStage";
import { Hero } from "@/components/sections/Hero";
import { SystemPrograms } from "@/components/sections/SystemPrograms";
import { Equipment } from "@/components/sections/Equipment";
import { Solutions } from "@/components/sections/Solutions";
import { Software } from "@/components/sections/Software";
import { FieldPresence } from "@/components/sections/FieldPresence";
import { EngineerNotes } from "@/components/sections/EngineerNotes";
import { FieldProof } from "@/components/sections/FieldProof";
import { Faq } from "@/components/sections/Faq";
import { Research } from "@/components/sections/Research";

export default function Home() {
  return (
    <main className="homePage finalHome">
      <Header />
      <Hero />
      <PartnerTicker />
      <SignalMarquee />
      <SystemPrograms />
      <Equipment />
      <Solutions />
      <Software />
      <FieldPresence />
      <EngineerNotes />
      <FieldProof />
      <Faq />
      <Research />
      <NextStage />
      <Footer />
    </main>
  );
}
