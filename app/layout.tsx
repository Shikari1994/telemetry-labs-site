import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { PagePreloader } from "@/components/motion/PagePreloader";
import { PageTransition } from "@/components/motion/PageTransition";
import "@fontsource-variable/unbounded";
import "@fontsource-variable/roboto-mono";
import "lenis/dist/lenis.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Telemetry Systems — Drilling Engineering",
  description: "Инженерные системы телеметрии для бурения: инклинометрия, гамма, резистивиметрия, MWD, ВЗД, наземное оборудование и ПО.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <PagePreloader />
        <PageTransition />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
