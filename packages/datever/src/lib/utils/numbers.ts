export function compare(a: number, b: number): number {
  return Number(a > b) - Number(b > a);
}

export function combineComparisons(...cmp: number[]): number {
  return cmp.reduce((cmp, next) => cmp || next);
}
