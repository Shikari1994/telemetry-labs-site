import { SectionHead } from "@/components/sections/SectionHead";
import { SectionOffer } from "@/components/sections/SectionOffer";
import { StackBoard } from "@/components/sections/StackBoard";

export function Stack() {
  return (
    <section className="block stack" id="stack" data-scene>
      <StackBoard
        head={
          <SectionHead
            index="06"
            label="STACK / BUILT WITH"
            title={["Технологии", "в работе"]}
            lead="Обе работы на одной плате: данные идут с буровой через сервер в офис и в поле, а рядом работает сайт."
          />
        }
      />
      <SectionOffer offer="stack" />
    </section>
  );
}
