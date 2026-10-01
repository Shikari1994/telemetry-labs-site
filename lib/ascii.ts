/** Text progress bars in the terminal idiom: ▓▓▓▓░░░░ 42%. */

export const BAR_FILL = "▓";
export const BAR_EMPTY = "░";

export function asciiBar(progress: number, length: number): [string, string] {
  const filled = Math.round(Math.min(1, Math.max(0, progress)) * length);
  return [BAR_FILL.repeat(filled), BAR_EMPTY.repeat(length - filled)];
}

export function percent(progress: number): string {
  return `${String(Math.round(Math.min(1, Math.max(0, progress)) * 100)).padStart(2, "0")}%`;
}

/** Writes a bar into `[data-bar-fill]`, `[data-bar-rest]` and `[data-bar-pct]`. */
export function paintBar(root: ParentNode, progress: number, length: number) {
  const [fill, rest] = asciiBar(progress, length);
  const fillNode = root.querySelector<HTMLElement>("[data-bar-fill]");
  const restNode = root.querySelector<HTMLElement>("[data-bar-rest]");
  const pctNode = root.querySelector<HTMLElement>("[data-bar-pct]");
  if (fillNode && fillNode.textContent !== fill) fillNode.textContent = fill;
  if (restNode && restNode.textContent !== rest) restNode.textContent = rest;
  const pct = percent(progress);
  if (pctNode && pctNode.textContent !== pct) pctNode.textContent = pct;
}
