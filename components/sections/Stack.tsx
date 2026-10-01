import { SectionHead } from "@/components/sections/SectionHead";
import { SectionOffer } from "@/components/sections/SectionOffer";
import { TechOrbit } from "@/components/sections/TechOrbit";

export function Stack() {
  return (
    <section className="block stack" id="stack" data-scene>
      <SectionHead
        index="06"
        label="STACK / BUILT WITH"
        title={["Технологии", "в работе"]}
        lead={
          <>
            Всё, на чём собраны обе работы: от анимации и 3D в браузере до серверов и мобильных приложений.
            {/* The sphere follows a mouse only; touch screens skip the hint. */}
            <span className="hoverHint"> Наведите курсор — сфера повернётся следом.</span>
          </>
        }
      />
      <TechOrbit />
      <SectionOffer offer="stack" />
    </section>
  );
}
