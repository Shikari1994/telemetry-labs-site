import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { PagePreloader } from "@/components/motion/PagePreloader";
import { PageTransition } from "@/components/motion/PageTransition";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource/tiny5";
import "lenis/dist/lenis.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "АЛЬФА КОД — портфолио",
  description: "Портфолио: сайт geo-tn.com и платформа мониторинга бурения Drill Monitor — интерфейсы для инженерных компаний.",
};

/* Set before first paint so pixel covers are in place before hydration and
   images never flash uncovered. MotionProvider owns the class afterwards. */
const motionFlag = `try{if(!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("motion-enabled")}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: motionFlag }} />
      </head>
      <body>
        <PagePreloader />
        <PageTransition />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
