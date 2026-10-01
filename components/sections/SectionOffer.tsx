import { AnchorLink } from "@/components/layout/AnchorLink";
import { offers } from "@/data/home";

type Props = {
  offer: keyof typeof offers;
};

/**
 * Closing line of a case section: what the section just showed, offered to
 * the visitor, with a jump to the request form. The motion layer runs tag,
 * line and button as one stepped sequence.
 */
export function SectionOffer({ offer }: Props) {
  const { tag, text } = offers[offer];
  return (
    <aside className="offer" data-offer>
      <p className="offerTag">
        <span aria-hidden="true">&gt;</span> <span data-offer-tag>{tag}</span>
      </p>
      <p className="offerText" data-offer-text>
        {text}
      </p>
      <AnchorLink className="btn btnPx" to="request" data-offer-cta>
        Обсудить проект <span aria-hidden="true">↓</span>
      </AnchorLink>
    </aside>
  );
}
