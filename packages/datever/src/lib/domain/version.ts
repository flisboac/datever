import { DateverError } from '../common/types';
import { parse } from '../parser/functions';
import { DateverParserError } from '../parser/types';
import { DateVersionDuration, DateVersionDurationLike } from './duration';
import { DateverLogicError } from './types';

export type DateVersionLike = string | number | Date | DateVersion;

export type DateVersionComponentName = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second';

export type DateVersionComponentMap = {
  [K in DateVersionComponentName]: number;
};

export type DateVersionDiff = DateVersionComponentMap & {
  distance: number;
};

const padComponent = (value: number, size: number) => String(value).padStart(size, '0');

const ensureValidDate = (value: Date): Date => {
  if (Number.isNaN(value.getTime())) {
    throw new DateverLogicError('Invalid epoch date.');
  }
  const date = new Date(value);
  date.setMilliseconds(0);
  return date;
};

export class DateVersion {
  static EPOCH = DateVersion.from(new Date(0));

  private constructor(public value: Date) {}

  static from(value: DateVersionLike[]): DateVersion[];
  static from(value: DateVersionLike): DateVersion;
  static from(value: DateVersionLike[] | DateVersionLike): DateVersion[] | DateVersion;
  static from(value: DateVersionLike[] | DateVersionLike): DateVersion[] | DateVersion {
    if (Array.isArray(value)) {
      return value.map(version => DateVersion.from(version));
    }

    if (value instanceof DateVersion) {
      return value;
    }

    if (value instanceof Date) {
      const date = ensureValidDate(value);
      return new DateVersion(new Date(date));
    }

    if (typeof value === 'number') {
      if (value < 0) {
        throw new DateverLogicError('Epoch date cannot be negative.');
      }
      const date = ensureValidDate(new Date(value));
      return new DateVersion(date);
    }

    if (typeof value === 'string') {
      const expr = parse(value);
      if (typeof expr !== 'object' || !expr || expr.type !== 'IDENTITY_EXPR' || expr.value.type !== 'VERSION') {
        throw new DateverParserError('Input string is not a version value.');
      }
      const { Y, M, D, h, m, s } = expr.value;
      const date = ensureValidDate(new Date(Date.UTC(Y, M, D, h, m, s)));
      return new DateVersion(date);
    }

    throw new DateverError('Invalid value type for a date version.');
  }

  static max(_versions: []): undefined;
  static max(_versions: DateVersionLike[]): DateVersion | undefined;
  static max(_versions: DateVersionLike[]): DateVersion | undefined {
    return DateVersion.from(_versions).sort(DateVersion.compare).pop();
  }

  static min(_versions: []): undefined;
  static min(_versions: DateVersionLike[]): DateVersion | undefined;
  static min(_versions: DateVersionLike[]): DateVersion | undefined {
    return DateVersion.from(_versions).sort(DateVersion.rcompare).pop();
  }

  static compare(lhs: DateVersionLike, rhs: DateVersionLike): number {
    return DateVersion.from(lhs).compare(rhs);
  }

  static rcompare(lhs: DateVersionLike, rhs: DateVersionLike): number {
    return DateVersion.from(rhs).compare(lhs);
  }

  stringify(): string {
    return this.toISOString();
  }

  slugify(): string {
    return (
      padComponent(this.value.getUTCFullYear(), 4) +
      padComponent(this.value.getUTCMonth() + 1, 2) +
      padComponent(this.value.getUTCDate(), 2) +
      padComponent(this.value.getUTCHours(), 2) +
      padComponent(this.value.getUTCMinutes(), 2) +
      padComponent(this.value.getUTCSeconds(), 2)
    );
  }

  toISOString(): string {
    return this.value.toISOString();
  }

  toEpoch(): number {
    return this.value.getTime();
  }

  valueOf(): number {
    return this.toEpoch();
  }

  toString(): string {
    return `DateVersion { date: ${this.toISOString()}, slug: '${this.slugify()}' }`;
  }

  component(component: DateVersionComponentName): number {
    switch (component) {
      case 'year':
        return this.value.getUTCFullYear();
      case 'month':
        return this.value.getUTCMonth();
      case 'day':
        return this.value.getUTCDate();
      case 'hour':
        return this.value.getUTCHours();
      case 'minute':
        return this.value.getUTCMinutes();
      case 'second':
        return this.value.getUTCSeconds();
      default:
        throw new DateverError(`Invalid component name "${component}".`);
    }
  }

  components(): DateVersionComponentMap {
    const year = this.value.getUTCFullYear();
    const month = this.value.getUTCMonth();
    const day = this.value.getUTCDate();
    const hour = this.value.getUTCHours();
    const minute = this.value.getUTCMinutes();
    const second = this.value.getUTCSeconds();
    return { year, month, day, hour, minute, second };
  }

  increment(component: DateVersionComponentName, amount = 1): DateVersion {
    const date = this.toDate();
    if (amount <= 0) {
      throw new DateverError('Increment amount must be greater than zero.');
    }
    switch (component) {
      case 'year':
        date.setUTCFullYear(date.getUTCFullYear() + amount);
        break;
      case 'month':
        date.setUTCMonth(date.getUTCMonth() + amount);
        break;
      case 'day':
        date.setUTCDate(date.getUTCDate() + amount);
        break;
      case 'hour':
        date.setUTCHours(date.getUTCHours() + amount);
        break;
      case 'minute':
        date.setUTCMinutes(date.getUTCMinutes() + amount);
        break;
      case 'second':
        date.setUTCSeconds(date.getUTCSeconds() + amount);
        break;
      default:
        throw new DateverError(`Invalid component name "${component}".`);
    }
    return new DateVersion(date);
  }

  decrement(component: DateVersionComponentName, amount = 1): DateVersion {
    return this.increment(component, -amount);
  }

  diff(rhs: DateVersionLike): DateVersionDiff {
    const other = DateVersion.from(rhs);
    const distance = this.toEpoch() - other.toEpoch();
    const lhsComponents = this.components();
    const rhsComponents = other.components();
    const year = lhsComponents.year - rhsComponents.year;
    const month = lhsComponents.month - rhsComponents.month;
    const day = lhsComponents.day - rhsComponents.day;
    const hour = lhsComponents.hour - rhsComponents.hour;
    const minute = lhsComponents.minute - rhsComponents.minute;
    const second = lhsComponents.second - rhsComponents.second;
    const diff = { distance, year, month, day, hour, minute, second };
    return diff;
  }

  addDuration(_duration: DateVersionDurationLike): DateVersion {
    const duration = DateVersionDuration.from(_duration);
    const date = this.toDate();
    date.setUTCFullYear(date.getUTCFullYear() + duration.year);
    date.setUTCMonth(date.getUTCMonth() + duration.month);
    date.setUTCDate(date.getUTCDate() + duration.day);
    date.setUTCHours(date.getUTCHours() + duration.hour);
    date.setUTCMinutes(date.getUTCMinutes() + duration.month);
    date.setUTCSeconds(date.getUTCSeconds() + duration.second);
    return new DateVersion(date);
  }

  minusDuration(_duration: DateVersionDurationLike): DateVersion {
    const duration = DateVersionDuration.from(_duration);
    const date = this.toDate();
    date.setUTCFullYear(date.getUTCFullYear() - duration.year);
    date.setUTCMonth(date.getUTCMonth() - duration.month);
    date.setUTCDate(date.getUTCDate() - duration.day);
    date.setUTCHours(date.getUTCHours() - duration.hour);
    date.setUTCMinutes(date.getUTCMinutes() - duration.month);
    date.setUTCSeconds(date.getUTCSeconds() - duration.second);
    return new DateVersion(date);
  }

  toDate(): Date {
    return new Date(this.value);
  }

  compare(_rhs: DateVersionLike): number {
    const rhs = DateVersion.from(_rhs);
    return Number(this.value > rhs.value) - Number(rhs.value > this.value);
  }
}
