import { DateverError } from '../common/types';
import { parse } from '../parser/functions';
import { BriefRangeValueNode, ConstantExprNode, DurationValueNode } from '../parser/rawParser';
import { DateverParserError } from '../parser/types';
import { compare } from '../utils/numbers';
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
  version: DateVersionLike;
  open?: boolean;
}

export class DateVersionRangeAnchor {
  readonly version: DateVersion;
  readonly open: boolean;

  private constructor(data: Pick<DateVersionRangeAnchor, 'version' | 'open'>) {
    this.version = data.version;
    this.open = data.open;
  }

  static from(value: DateVersionRangeAnchorLike) {
    if (value instanceof DateVersionRangeAnchor) {
      return value;
    }

    if (typeof value === 'object' && value) {
      return new DateVersionRangeAnchor({
        version: DateVersion.from(value.version),
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
      lower = DateVersionRangeAnchor.from({ version: value, open: false });
      upper = DateVersionRangeAnchor.from({ version: value, open: false });
      break;

    case 'YEAR_RANGE':
      lower = DateVersionRangeAnchor.from({
        version: DateVersion.from(new Date(Date.UTC(expr.Y, 0, 1, 0, 0, 0))),
        open: false,
      });
      upper = DateVersionRangeAnchor.from({
        version: DateVersion.from(new Date(Date.UTC(expr.Y, 11, 31, 23, 59, 59))),
        open: false,
      });
      break;

    case 'MONTH_RANGE':
      lower = DateVersionRangeAnchor.from({
        version: DateVersion.from(new Date(Date.UTC(expr.Y, expr.M + 1, 1, 0, 0, 0))),
        open: false,
      });
      upper = DateVersionRangeAnchor.from({
        version: DateVersion.from(new Date(Date.UTC(expr.Y, expr.M + 1, 31, 23, 59, 59))),
        open: false,
      });
      break;

    case 'DAY_RANGE':
      lower = DateVersionRangeAnchor.from({
        version: DateVersion.from(new Date(Date.UTC(expr.Y, expr.M + 1, expr.D, 0, 0, 0))),
        open: false,
      });
      upper = DateVersionRangeAnchor.from({
        version: DateVersion.from(new Date(Date.UTC(expr.Y, expr.M + 1, expr.D, 23, 59, 59))),
        open: false,
      });
      break;

    case 'HOUR_RANGE':
      lower = DateVersionRangeAnchor.from({
        version: DateVersion.from(new Date(Date.UTC(expr.Y, expr.M + 1, expr.D, expr.h, 0, 0))),
        open: false,
      });
      upper = DateVersionRangeAnchor.from({
        version: DateVersion.from(new Date(Date.UTC(expr.Y, expr.M + 1, expr.D, expr.h, 59, 59))),
        open: false,
      });
      break;

    case 'MINUTE_RANGE':
      lower = DateVersionRangeAnchor.from({
        version: DateVersion.from(new Date(Date.UTC(expr.Y, expr.M + 1, expr.D, expr.h, expr.m, 0))),
        open: false,
      });
      upper = DateVersionRangeAnchor.from({
        version: DateVersion.from(new Date(Date.UTC(expr.Y, expr.M + 1, expr.D, expr.h, expr.m, 59))),
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
  /**
   * The range's lower bound.
   */
  readonly lower?: DateVersionRangeAnchor;

  /**
   * The range's upper bound.
   */
  readonly upper?: DateVersionRangeAnchor;

  private readonly _minEpoch: number;
  private readonly _maxEpoch: number;

  private constructor(data: Pick<DateVersionRange, 'lower' | 'upper'>) {
    const { lower, upper } = data;
    this.lower = lower;
    this.upper = upper;
    this._minEpoch = lower
      ? (!lower.open ? lower.version : lower.version.increment('lowest')).toEpoch()
      : Number.NEGATIVE_INFINITY;
    this._maxEpoch = upper
      ? (!upper.open ? upper.version : upper.version.decrement('lowest')).toEpoch()
      : Number.POSITIVE_INFINITY;
  }

  /**
   * Converts an array of range-like values to a range object.
   * @param value The array of ranges.
   * @see #from(value: DateVersionRangeLike[] | DateVersionRangeLike)
   */
  static from(value: DateVersionRangeLike[]): DateVersionRange[];
  /**
   * Converts a range-like value to a range object.
   * @param value The array of ranges.
   */
  static from(value: DateVersionRangeLike): DateVersionRange;
  /**
   * Converts single or multiple range-like values to range objects.
   * @param value The array of ranges.
   */
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
        lower: DateVersionRangeAnchor.from({ version: value }),
        upper: DateVersionRangeAnchor.from({ version: value }),
      });
    }

    if (typeof value === 'object' && value && ('lower' in value || 'upper' in value)) {
      range = new DateVersionRange({
        lower: value.lower ? DateVersionRangeAnchor.from(value.lower) : undefined,
        upper: value.upper ? DateVersionRangeAnchor.from(value.upper) : undefined,
      });
    } else if (value instanceof Date || typeof value === 'number') {
      range = new DateVersionRange({
        lower: DateVersionRangeAnchor.from({ version: value }),
        upper: DateVersionRangeAnchor.from({ version: value }),
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
              version: createBriefVersionAnchors(expr.value.lower.lower).lower.version,
              open: openOperators.includes(expr.value.lower.anchor),
            });
            upper = DateVersionRangeAnchor.from({
              version: createBriefVersionAnchors(expr.value.upper.upper).upper.version,
              open: openOperators.includes(expr.value.upper.anchor),
            });
          }
          break;

        case 'LOWER_BOUNDED_RANGE':
          {
            const open = openOperators.includes(expr.value.anchor);
            const limits = createBriefVersionAnchors(expr.value.lower);
            const value = open
              ? //  e.g. ">  2020"  ===  ">  2020-12-31T23:59:59"   ( internally, ">=  2021-01-01T00:00:00" )
                limits.upper.version
              : //  e.g. ">= 2020"  ===  ">= 2020-01-01T00:00:00"
                limits.lower.version;
            lower = DateVersionRangeAnchor.from({ version: value, open: open });
          }
          break;

        case 'UPPER_BOUNDED_RANGE':
          {
            const open = openOperators.includes(expr.value.anchor);
            const limits = createBriefVersionAnchors(expr.value.upper);
            const value = open
              ? //  e.g. "<  2020"  ===  "<  2020-01-01T00:00:00"  ( internally, "<=  2019-12-31T23:59:59" )
                limits.lower.version
              : //  e.g. "<= 2020"  ===  "<= 2020-12-31T23:59:59"
                limits.upper.version;
            upper = DateVersionRangeAnchor.from({ version: value, open: open });
          }
          break;

        case 'LOWER_DURATION_RANGE':
          {
            const limits = createBriefVersionAnchors(expr.value.lower);
            const duration = createDuration(expr.value.duration);
            const value = lower.version.addDuration(duration);
            lower = limits.lower;
            upper = DateVersionRangeAnchor.from({ version: value, open: false });
          }
          break;

        case 'UPPER_DURATION_RANGE':
          {
            const limits = createBriefVersionAnchors(expr.value.upper);
            const duration = createDuration(expr.value.duration);
            const value = upper.version.minusDuration(duration);
            upper = limits.upper;
            lower = DateVersionRangeAnchor.from({ version: value, open: false });
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

      if (range.lower && range.upper && range.lower.version.compare(range.upper.version) > 0) {
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
    return DateVersionRange.from(lhs).rcompare(rhs);
  }

  /**
   * Obtains the maximum range from a collection of range-likes.
   *
   * @param values The range-likes to compare.
   * @returns The highest range in the collection (as compared by DateVersionRange#rcompare),
   * or `undefined` if the input collection is empty.
   */
  static max(values: DateVersionRangeLike[]): DateVersionRange | undefined {
    // TODO Add signature and implementation for `values: Iterator<DateVersionRangeLike>`
    return DateVersionRange.from(values).sort(DateVersionRange.compare).pop();
  }

  /**
   * Obtains the minimum range from a collection of range-likes.
   *
   * @param values The range-likes to compare.
   * @returns The lowest range in the collection (as compared by DateVersionRange#rcompare),
   * or `undefined` if the input collection is empty.
   */
  static min(values: DateVersionRangeLike[]): DateVersionRange | undefined {
    // TODO Add signature and implementation for `values: Iterator<DateVersionRangeLike>`
    return DateVersionRange.from(values).sort(DateVersionRange.rcompare).pop();
  }

  /**
   * Indicates that the range refers to a single version.
   */
  get singular(): boolean {
    return this.lower && this.upper && this.lower.version.compare(this.upper.version) === 0;
  }

  /**
   * The minimum version that this range includes, or `undefined` if the lower bound is open (i.e.
   * there's no minimum, but there IS a maximum).
   */
  get minVersion(): DateVersion | undefined {
    return this.lower && (!this.lower.open ? this.lower.version : this.lower.version.increment('second'));
  }

  /**
   * The maximum version that this range includes, or `undefined` if the upper bound is open (i.e.
   * there's no maximum, but there IS a minimum).
   */
  get maxVersion(): DateVersion | undefined {
    return this.upper && (!this.upper.open ? this.upper.version : this.upper.version.decrement('second'));
  }

  /**
   * The total (effective) number of versions contemplated by this range, or positive infinity if the range
   * is open in either end (lower or upper).
   */
  get versionCount(): typeof Number['POSITIVE_INFINITY'] | number {
    return this.lower && this.upper
      ? (this.lower.version.toEpoch() - this.upper.version.toEpoch()) / 1000
      : Number.POSITIVE_INFINITY;
  }

  /**
   * Verifies if a range is **strictly equal** to another.
   *
   * Strict equality in this context means that both versions refer to the same (and exact) version range,
   * i.e. must have the same maximum and minimum versions. Open-endedness compares equal to itself, and
   * different otherwise.
   *
   * @param _rhs The other range-like value to compare.
   * @returns `true` if ranges are equal, `false` otherwise.
   */
  equals(_rhs: DateVersionRangeLike): boolean {
    const rhs = DateVersionRange.from(_rhs);
    return this._minEpoch === rhs._minEpoch && this._maxEpoch === rhs._maxEpoch;
  }

  /**
   * Orders two ranges, in ascending order.
   *
   * Ordering is done as in interval arithmetic, with the addition of minimum version comparison
   * if two open ranges eventually compare equal -- in which case, open-endedness compares less.
   *
   * @TODO Determine if ordering is total or partial (will need to evaluate the implications of each)
   * @param _rhs The range-like to compare.
   * @returns `-1` if `this < _rhs`, `1` if this > _rhs`, and `0` otherwise.
   */
  compare(_rhs: DateVersionRangeLike): number {
    const rhs = DateVersionRange.from(_rhs);
    const comesBefore = this._maxEpoch < rhs._minEpoch;
    const comesAfter = rhs._maxEpoch < this._minEpoch;
    const cmp = Number(comesAfter) - Number(comesBefore);
    return cmp || compare(this._minEpoch, rhs._minEpoch);
  }

  /**
   * Orders two ranges, in descending order.
   *
   * Ordering is done as in interval arithmetic, with the addition of minimum version comparison
   * if two open ranges eventually compare equal -- in which case, open-endedness compares less.
   *
   * @TODO Determine if ordering is total or partial (will need to evaluate the implications of each)
   * @param _rhs The range-like to compare.
   * @returns `-1` if `this > _rhs`, `1` if this < _rhs`, and `0` otherwise.
   */
  rcompare(_rhs: DateVersionRangeLike): number {
    const rhs = DateVersionRange.from(_rhs);
    const isBefore = this._maxEpoch < rhs._minEpoch;
    const isAfter = rhs._maxEpoch < this._minEpoch;
    const cmp = Number(isBefore) - Number(isAfter);
    return cmp || compare(this._maxEpoch, rhs._maxEpoch);
  }

  /**
   * Verifies if `this` wholly includes another range-like value.
   *
   * Effectively, this verifies if another range is a **subset** of this range.
   *
   * Version inclusion (i.e. passing a version-like value) can also be verified
   * through this method (as in the range being satisfied by the version).
   *
   * @param _rhs The range-like to compare.
   * @returns `true` if `_rhs` is "inside" `this`, or `false` otherwise.
   */
  includes(_rhs: DateVersionRangeLike): boolean {
    const rhs = DateVersionRange.from(_rhs);
    return this._minEpoch >= rhs._minEpoch && this._maxEpoch <= rhs._maxEpoch;
  }

  /**
   * Verifies if another range-like orders entirely after this range.
   *
   * In other words, the following assertions must hold if `this.greaterThan(_rhs)`:
   * 1. `this` and `_rhs` must not overlap (i.e. there is no intersection between them); and
   * 2. `this`'s upper limit must come before `_rhs`'s lower limit.
   *
   * @param _rhs The range-like to compare.
   * @returns `true` if `_rhs_` is entirely after `this`, `false` otherwise.
   */
  greaterThan(_rhs: DateVersionRangeLike): boolean {
    const rhs = DateVersionRange.from(_rhs);
    return this._minEpoch > rhs._maxEpoch;
  }

  /**
   * Verifies if another range-like orders entirely before this range.
   *
   * In other words, the following assertions must hold if `this.lessThan(_rhs)`:
   * 1. `this` and `_rhs` must not overlap (i.e. there is no intersection between them); and
   * 2. `this`'s lower limit must come after `_rhs`'s upper limit.
   *
   * @param _rhs The range-like to compare.
   * @returns `true` if `_rhs_` is entirely before `this`, `false` otherwise.
   */
  lessThan(_rhs: DateVersionRangeLike): boolean {
    const rhs = DateVersionRange.from(_rhs);
    return this._maxEpoch < rhs._minEpoch;
  }

  /**
   * Creates a new range containing the intersection between this and another range.
   *
   * @param _rhs The range-like to compare.
   * @returns A range that contemplates the versions in common between `this` and `_rhs`;
   * otherwise (i.e. if they do not overlap), `undefined` is returned.
   */
  intersection(_rhs: DateVersionRangeLike): DateVersionRange | undefined {
    const rhs = DateVersionRange.from(_rhs);

    if (rhs._minEpoch > this._maxEpoch || this._maxEpoch > rhs._minEpoch) {
      // There is no intersection
      return undefined;
    }

    const minEpoch = DateVersion.max([this._minEpoch, rhs._minEpoch]);
    const maxEpoch = DateVersion.min([this._maxEpoch, rhs._maxEpoch]);

    return new DateVersionRange({
      lower: Number.isFinite(minEpoch) ? DateVersionRangeAnchor.from({ version: minEpoch }) : undefined,
      upper: Number.isFinite(maxEpoch) ? DateVersionRangeAnchor.from({ version: maxEpoch }) : undefined,
    });
  }

  /**
   * Returns the greatest version that satisfies the range.
   *
   * @param _versions The versions to compare.
   * @returns The greatest version that satisfies the range, or `undefined` if `_versions` is empty.
   */
  maxSatisfying(_versions: DateVersionLike[] | Iterator<DateVersionLike>): DateVersion | undefined {
    return this._lastSatisfying(_versions, DateVersion.max);
  }

  /**
   * Returns the lowest version that satisfies the range.
   *
   * @param _versions The versions to compare.
   * @returns The lowest version that satisfies the range, or `undefined` if `_versions` is empty.
   */
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
      if (this.includes(next.value)) {
        result = result ? compare([result, next.value]) : next.value;
      }
    }

    return result;
  }
}
