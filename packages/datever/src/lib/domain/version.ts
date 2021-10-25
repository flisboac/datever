import { DateverError } from '../common/types';
import { parse } from '../parser';
import { ParserNodeType } from '../parser/rawParser.types';

export type DateVersionLike = string | number | Date | DateVersion;

export type DateVersionComponentName = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second';

const padComponent = (value: number, size: number) => String(value).padStart(size, '0');

const ensureValidDate = (value: Date): Date => {
  if (Number.isNaN(value.getTime())) {
    throw new DateverError('Invalid epoch date.');
  }
  const date = new Date(value);
  date.setMilliseconds(0);
  return date;
};

export class DateVersion {
  static EPOCH = DateVersion.from(new Date(0));

  private constructor(public value: Date) {}

  static from(value: DateVersionLike): DateVersion {
    if (value instanceof DateVersion) {
      return value;
    }

    if (value instanceof Date) {
      const date = ensureValidDate(value);
      return new DateVersion(new Date(date));
    }

    if (typeof value === 'number') {
      if (value < 0) {
        throw new DateverError('Epoch date cannot be negative.');
      }
      const date = ensureValidDate(new Date(value));
      return new DateVersion(date);
    }

    if (typeof value === 'string') {
      const expr = parse(value);
      if (
        typeof expr !== 'object' ||
        !expr ||
        expr.type !== ParserNodeType.IDENTITY_EXPR ||
        expr.value.type !== ParserNodeType.VERSION
      ) {
        throw new DateverError('String is not a version value.');
      }
      const { Y, M, D, h, m, s } = expr.value;
      const date = ensureValidDate(new Date(Date.UTC(Y, M, D, h, m, s)));
      return new DateVersion(date);
    }

    throw new DateverError('Invalid value type for a date version.');
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

  toISOString() {
    return this.value.toISOString();
  }

  valueOf(): number {
    return this.value.getTime();
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

  toDate(): Date {
    return new Date(this.value);
  }

  compare(_rhs: DateVersionLike): number {
    const rhs = DateVersion.from(_rhs);
    return Number(this.value > rhs.value) - Number(rhs.value > this.value);
  }
}
