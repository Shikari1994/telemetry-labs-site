import { passports } from "@/data/home";

type Props = {
  work: keyof typeof passports;
};

/**
 * The passport under a case opener: who the work is for, the task, where it
 * runs and what we did, before any of its features. Rendered inside the
 * SectionHead, so it boots with the head: the cells wipe in one after another
 * once the lead is in.
 */
export function CasePassport({ work }: Props) {
  return (
    <dl className="passport" data-passport>
      {passports[work].map((fact) => (
        <div key={fact.label}>
          <dt>{fact.label}</dt>
          <dd>{fact.text}</dd>
        </div>
      ))}
    </dl>
  );
}
