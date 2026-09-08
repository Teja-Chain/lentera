export function hashHue(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

export function addressGradient(address: string): string {
  const hue = hashHue(address.toLowerCase());
  return `linear-gradient(135deg, hsl(${hue}, 75%, 58%), hsl(${(hue + 55) % 360}, 75%, 48%))`;
}
