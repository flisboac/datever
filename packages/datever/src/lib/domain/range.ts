import { DateverError } from '../common/types';
import { parse } from '../parser/functions';
import { BriefRangeValueNode, ConstantExprNode, DurationValueNode } from '../parser/rawParser';
import { DateverParserError } from '../parser/types';
import { DateVersionDuration } from './duration';
import { DateverLogicError } from './types';
import { DateVersion, DateVersionLike } from './version';

export type DateVersionRangeLike = string | DateVersionLike | DateVersionRange | DateVersionRangeProps;

export type DateVersionRangeAnchorLike = DateVersionRangeAnchor | DateVersionRangeAnchorProps;

export interface DateVersionRangeProps {
  lower?: DateVersionRangeAnchorLike;
  upper?: DateVersionRangeAnchorLike;
}

export interface DateVersionRangeAnchorProps {
  value: DateVersionLike;
  open?: boolean;
}

export class DateVersionRangeAnchor {
  readonly value: DateVersion;
  readonly open: boolean;

  private constructor(data: Pick<DateVersionRangeAnchor, 'value' | 'open'>) {
    this.value = data.value;
    this.open = data.open;
  }

  static from(value: DateVersionRangeAnchorLike) {
    if (value instanceof DateVersionRangeAnchor) {
      return value;
    }

    if (typeof value === 'object' && value) {
      return new DateVersionRangeAnchor({
        value: DateVersion.from(value.value),
        open: value.open ?? false,
      });
    }

    throw new DateverError('Invalid value type for a date version range anchor.');
  }
}

const openOperators = ['GT', 'LT'];

const createBriefVersionAnchors = (
  expr: ConstantExprNode | BriefRangeValueNode,
): Pick<DateVersionRange, 'lower' | 'upper'> => {
  let lower: DateVersionRangeAnchor;
  let upper: DateVersionRangeAnchor;

  switch (expr.type) {
    case 'VERSION':
      const value = DateVersion.from(new Date(Date.UTC(expr.Y, expr.M, expr.D, expr.h, expr.m, expr.s)));
      lower = DateVersionRangeAnchor.from({ value, open: false });
      upper = DateVersionRangeAnchor.from({ value, open: false });
      break;

    case 'YEAR_RANGE':
      lower = DateVersionRangeAnchor.from({
        value: DateVersion.from(new Date(Date.UTC(expr.Y, 0, 1, 0, 0, 0))),
        open: false,
      });
      upper = DateVersionRangeAnchor.from({
        value: DateVersion.from(new Date(Date.UTC(expr.Y, 11, 31, 23, 59, 59))),
        open: false,
      });
      break;

    case 'MONTH_RANGE':
      lower = DateVersionRangeAnchor.from({
        value: DateVersion.from(new Date(Date.UTC(expr.Y, expr.M + 1, 1, 0, 0, 0))),
        open: false,
      });
      upper = DateVersionRangeAnchor.from({
        value: DateVersion.from(new Date(Date.UTC(expr.Y, expr.M + 1, 31, 23, 59, 59))),
        open: false,
      });
      break;

    case 'DAY_RANGE':
      lower = DateVersionRangeAnchor.from({
        value: DateVersion.from(new Date(Date.UTC(expr.Y, expr.M + 1, expr.D, 0, 0, 0))),
        open: false,
      });
      upper = DateVersionRangeAnchor.from({
        value: DateVersion.from(new Date(Date.UTC(expr.Y, expr.M + 1, expr.D, 23, 59, 59))),
        open: false,
      });
      break;

    case 'HOUR_RANGE':
      lower = DateVersionRangeAnchor.from({
        value: DateVersion.from(new Date(Date.UTC(expr.Y, expr.M + 1, expr.D, expr.h, 0, 0))),
        open: false,
      });
      upper = DateVersionRangeAnchor.from({
        value: DateVersion.from(new Date(Date.UTC(expr.Y, expr.M + 1, expr.D, expr.h, 59, 59))),
        open: false,
      });
      break;

    case 'MINUTE_RANGE':
      lower = DateVersionRangeAnchor.from({
        value: DateVersion.from(new Date(Date.UTC(expr.Y, expr.M + 1, expr.D, expr.h, expr.m, 0))),
        open: false,
      });
      upper = DateVersionRangeAnchor.from({
        value: DateVersion.from(new Date(Date.UTC(expr.Y, expr.M + 1, expr.D, expr.h, expr.m, 59))),
        open: false,
      });
      break;

    default:
      throw new DateverParserError('Input string is not a version value.');
  }

  return { lower, upper };
};

const createDuration = (value: DurationValueNode): DateVersionDuration => {
  return DateVersionDuration.from({
    year: value.Y,
    month: value.M,
    day: value.D,
    hour: value.h,
    minute: value.m,
    second: value.s,
  });
};

export class DateVersionRange {
  readonly lower?: DateVersionRangeAnchor;
  readonly upper?: DateVersionRangeAnchor;
  readonly minVersion: DateVersion;
  readonly maxVersion: DateVersion;

  private constructor(data: Pick<DateVersionRange, 'lower' | 'upper'>) {
    const { lower, upper } = data;
    this.lower = lower;
    this.upper = upper;
    this.minVersion = ((): DateVersion => {
      if (
        // range is fully bound, OR
        (lower && upper) ||
        // range is lower-bounded only
        lower
      ) {
        return !lower.open ? lower.value : lower.value.increment('second');
      }
      // Ranges cannot have nullish on both lower and upper, therefore
      // this is an upper-bounded only range
      return !upper.open ? upper.value : upper.value.decrement('second');
    })();
    this.maxVersion = ((): DateVersion => {
      if (
        // range is fully bound, OR
        (lower && upper) ||
        // range is lower-bounded only
        upper
      ) {
        return !upper.open ? upper.value : upper.value.decrement('second');
      }
      // Ranges cannot have nullish on both lower and upper, therefore
      // this is an upper-bounded only range
      return !lower.open ? lower.value : lower.value.increment('second');
    })();
  }

  static from(value: DateVersionRangeLike[]): DateVersionRange[];
  static from(value: DateVersionRangeLike): DateVersionRange;
  static from(value: DateVersionRangeLike[] | DateVersionRangeLike): DateVersionRange[] | DateVersionRange;
  static from(value: DateVersionRangeLike[] | DateVersionRangeLike): DateVersionRange[] | DateVersionRange {
    let range: DateVersionRange;

    if (Array.isArray(value)) {
      return value.map(range => DateVersionRange.from(range));
    }

    if (value instanceof DateVersionRange) {
      return value;
    }

    if (value instanceof DateVersion) {
      return new DateVersionRange({
        lower: DateVersionRangeAnchor.from({ value }),
        upper: DateVersionRangeAnchor.from({ value }),
      });
    }

    if (typeof value === 'object' && value && ('lower' in value || 'upper' in value)) {
      range = new DateVersionRange({
        lower: value.lower ? DateVersionRangeAnchor.from(value.lower) : undefined,
        upper: value.upper ? DateVersionRangeAnchor.from(value.upper) : undefined,
      });
    } else if (value instanceof Date || typeof value === 'number') {
      range = new DateVersionRange({
        lower: DateVersionRangeAnchor.from({ value }),
        upper: DateVersionRangeAnchor.from({ value }),
      });
    } else if (typeof value === 'string') {
      const expr = parse(value);

      if (typeof expr !== 'object' || !expr || expr.type !== 'IDENTITY_EXPR') {
        throw new DateverParserError('Input string is not a version value.');
      }

      let lower: DateVersionRangeAnchor;
      let upper: DateVersionRangeAnchor;

      switch (expr.value.type) {
        case 'VERSION':
        case 'YEAR_RANGE':
        case 'MONTH_RANGE':
        case 'DAY_RANGE':
        case 'HOUR_RANGE':
        case 'MINUTE_RANGE':
          {
            const limits = createBriefVersionAnchors(expr.value);
            lower = limits.lower;
            upper = limits.upper;
          }
          break;

        case 'FULLY_BOUNDED_RANGE':
          {
            lower = DateVersionRangeAnchor.from({
              value: createBriefVersionAnchors(expr.value.lower.lower).lower.value,
              open: openOperators.includes(expr.value.lower.anchor),
            });
            upper = DateVersionRangeAnchor.from({
              value: createBriefVersionAnchors(expr.value.upper.upper).upper.value,
              open: openOperators.includes(expr.value.upper.anchor),
            });
          }
          break;

        case 'LOWER_BOUNDED_RANGE':
          {
            const open = openOperators.includes(expr.value.anchor);
            const limits = createBriefVersionAnchors(expr.value.lower);
            const value = open
              ? //  e.g. ">  2020"  ===  ">  2020-12-31T23:59:59"   ( ===  ">=  2021-01-01T00:00:00" )
                limits.upper.value
              : //  e.g. ">= 2020"  ===  ">= 2020-01-01T00:00:00"
                limits.lower.value;
            lower = DateVersionRangeAnchor.from({ value, open });
          }
          break;

        case 'UPPER_BOUNDED_RANGE':
          {
            const open = openOperators.includes(expr.value.anchor);
            const limits = createBriefVersionAnchors(expr.value.upper);
            const value = open
              ? //  e.g. "<  2020"  ===  "<  2020-01-01T00:00:00"  ===  "<  2020-01-01T00:00:00"  (  ===  "<=  2019-12-31T23:59:59" )
                limits.lower.value
              : //  e.g. "<= 2020"  ===  "<= 2020-12-31T23:59:59"
                limits.upper.value;
            upper = DateVersionRangeAnchor.from({ value, open });
          }
          break;

        case 'LOWER_DURATION_RANGE':
          {
            const limits = createBriefVersionAnchors(expr.value.lower);
            const duration = createDuration(expr.value.duration);
            const value = lower.value.addDuration(duration);
            lower = limits.lower;
            upper = DateVersionRangeAnchor.from({ value, open: false });
          }
          break;

        case 'UPPER_DURATION_RANGE':
          {
            const limits = createBriefVersionAnchors(expr.value.upper);
            const duration = createDuration(expr.value.duration);
            const value = upper.value.minusDuration(duration);
            upper = limits.upper;
            lower = DateVersionRangeAnchor.from({ value, open: false });
          }
          break;

        default:
          throw new DateverParserError('Input string is not a version value.');
      }

      range = new DateVersionRange({ lower, upper });
    }

    if (range) {
      if (!range.lower && !range.upper) {
        throw new DateverLogicError('Date version range cannot be empty.');
      }

      if (range.lower && range.upper && range.lower.value.compare(range.upper.value) > 0) {
        throw new DateverLogicError('Lower bound cannot be greater than the upper bound.');
      }

      return range;
    }

    throw new DateverError('Invalid value for a date version range.');
  }

  static compare(lhs: DateVersionRangeLike, rhs: DateVersionRangeLike): number {
    return DateVersionRange.from(lhs).compare(rhs);
  }

  static rcompare(lhs: DateVersionRangeLike, rhs: DateVersionRangeLike): number {
    return DateVersionRange.from(rhs).compare(lhs);
  }

  static max(values: []): undefined;
  static max(values: DateVersionRangeLike[]): DateVersionRange | undefined;
  static max(values: DateVersionRangeLike[]): DateVersionRange | undefined {
    return DateVersionRange.from(values).sort(DateVersionRange.compare).pop();
  }

  static min(values: []): undefined;
  static min(values: DateVersionRangeLike[]): DateVersionRange | undefined;
  static min(values: DateVersionRangeLike[]): DateVersionRange | undefined {
    return DateVersionRange.from(values).sort(DateVersionRange.rcompare).pop();
  }

  /**
   * Indicates that the range refers to a single version.
   *
   * Single-version ranges can be created with a single date-version-like value.
   */
  get singular() {
    return this.lower && this.upper && this.lower.value.compare(this.upper.value) === 0;
  }

  compare(_rhs: DateVersionRangeLike): number {
    const rhs = DateVersionRange.from(_rhs);
    return this.minVersion.compare(rhs.minVersion);
  }

  isSatisfiedBy(_version: DateVersionLike): DateVersion | undefined {
    const version = DateVersion.from(_version);
    const checks = this.compare(version);
    if (checks === 0) {
      return version;
    }
    return undefined;
  }

  isVersionOutside(_version: DateVersionLike): DateVersion | undefined {
    const version = DateVersion.from(_version);
    const checks = this.compare(version);
    if (checks !== 0) {
      return version;
    }
    return undefined;
  }

  isVersionGreater(_version: DateVersionLike): DateVersion | undefined {
    const version = DateVersion.from(_version);
    const checks = this.compare(version);
    if (typeof checks === 'number' && checks > 0) {
      return version;
    }
    return undefined;
  }

  isVersionLess(_version: DateVersionLike): DateVersion | undefined {
    const version = DateVersion.from(_version);
    const checks = this.compare(version);
    if (typeof checks === 'number' && checks < 0) {
      return version;
    }
    return undefined;
  }

  isSubsetOf(_rhs: DateVersionRangeLike): boolean {
    const rhs = DateVersionRange.from(_rhs);
    return this.minVersion.compare(rhs.minVersion) >= 0 && this.maxVersion.compare(rhs.maxVersion) <= 0;
  }

  intersectedBy(_rhs: DateVersionRangeLike): DateVersionRange | undefined {
    const rhs = DateVersionRange.from(_rhs);

    if (rhs.minVersion.compare(this.maxVersion) > 0 || this.maxVersion.compare(rhs.minVersion) > 0) {
      return undefined;
    }

    const minVersion = DateVersion.max([this.minVersion, rhs.minVersion]);
    const maxVersion = DateVersion.min([this.maxVersion, rhs.maxVersion]);

    return new DateVersionRange({
      lower: DateVersionRangeAnchor.from({ value: minVersion }),
      upper: DateVersionRangeAnchor.from({ value: maxVersion }),
    });
  }

  maxSatisfying(_versions: DateVersionLike[] | Iterator<DateVersionLike>): DateVersion | undefined {
    return this._lastSatisfying(_versions, DateVersion.max);
  }

  minSatisfying(_versions: DateVersionLike[] | Iterator<DateVersionLike>): DateVersion | undefined {
    return this._lastSatisfying(_versions, DateVersion.min);
  }

  private _lastSatisfying(
    versions: DateVersionLike[] | Iterator<DateVersionLike>,
    compare: (values: DateVersion[]) => DateVersion,
  ): DateVersion | undefined {
    versions = Array.isArray(versions) ? versions[Symbol.iterator]() : versions;
    let result: DateVersion | undefined;

    for (let next = versions.next(); !next.done; next = versions.next()) {
      if (this.isSatisfiedBy(next.value)) {
        result = result ? compare([result, next.value]) : next.value;
      }
    }

    return result;
  }
}
