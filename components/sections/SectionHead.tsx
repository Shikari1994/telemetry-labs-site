import type { ReactNode } from "react";
import { PixelText } from "@/components/pixel/PixelText";

type Props = {
  index: string;
  label: string;
  /** One entry per rendered line; each line is revealed on its own. */
  title: string[];
  titleId?: string;
  lead?: ReactNode;
  children?: ReactNode;
};

/**
 * Shared section opener, text-mode: the section number as a bitmap numeral
 * in its own column, the machine label, a pixel headline and a mono lead.
 * The motion layer builds the numeral pixel by pixel, decodes the label,
 * wipes the headline line by line in stepped increments, then brings the
 * lead in — one sequence per section.
 */
export function SectionHead({ index, label, title, titleId, lead, children }: Props) {
  return (
    <header className="blockHead" data-block-head>
      <div className="blockNum" data-head-num>
        <PixelText text={index} />
      </div>
      <p className="blockLabel">
        <span className="blockIdx">{index}</span>
        <span className="blockSlash" aria-hidden="true">/</span>
        <span data-scramble>{label}</span>
      </p>
      <h2 className="blockTitle" id={titleId}>
        {title.map((line) => (
          <span className="ln" key={line}>
            <span data-title-line>{line}</span>
          </span>
        ))}
      </h2>
      {lead ? (
        <p className="blockLead" data-block-lead>
          {lead}
        </p>
      ) : null}
      {children}
    </header>
  );
}
