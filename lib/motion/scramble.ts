/* Unresolved characters decode through block glyphs, like a raster filling. */
const SCRAMBLE_GLYPHS = "░▒▓█▚▞▖▗▘▝";

export function scrambleElement(element: HTMLElement, duration = 620) {
  const finalText = element.dataset.scrambleText ?? element.textContent ?? "";
  element.dataset.scrambleText = finalText;
  const startedAt = performance.now();

  const draw = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    const resolved = Math.floor(finalText.length * (1 - Math.pow(1 - progress, 2.2)));
    let output = "";
    for (let index = 0; index < finalText.length; index += 1) {
      const char = finalText[index];
      if (/\s/.test(char) || index < resolved || progress === 1) output += char;
      else output += SCRAMBLE_GLYPHS[(index * 7 + Math.floor(now / 50)) % SCRAMBLE_GLYPHS.length];
    }
    element.textContent = output;
    if (progress < 1) requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}
