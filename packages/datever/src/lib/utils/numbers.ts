export function compare(a: number, b: number): number {
  return Number(a < b) - Number(b < a);
}
