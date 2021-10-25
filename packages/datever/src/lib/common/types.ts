export enum LowerBoundedRangeAnchorType {
  GT = 'GT',
  GE = 'GE',
}

export enum UpperBoundedRangeAnchorType {
  LT = 'LT',
  LE = 'LE',
}

export class DateverError extends Error {
  readonly cause?: any;

  constructor(contents?: string | Omit<DateverError, 'name'>, cause?: any) {
    super(typeof contents === 'string' ? contents : contents.message);
    this.cause = cause;
    if (typeof contents === 'object' && contents) {
      this.cause = this.cause ?? contents.cause;
    }
  }
}
