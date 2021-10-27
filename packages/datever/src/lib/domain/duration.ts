import { DateverError } from '../common/types';
import { parse } from '../parser/functions';
import { DateverParserError } from '../parser/types';

export type DateVersionDurationLike = string | DateVersionDuration | Partial<DateVersionDuration>;

export interface DateVersionDurationProps {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export class DateVersionDuration {
  readonly year: number = 0;
  readonly month: number = 0;
  readonly day: number = 0;
  readonly hour: number = 0;
  readonly minute: number = 0;
  readonly second: number = 0;

  private constructor(data?: DateVersionDurationProps) {
    if (data) {
      this.year = data.year || 0;
      this.month = data.month || 0;
      this.day = data.day || 0;
      this.hour = data.hour || 0;
      this.minute = data.minute || 0;
      this.second = data.second || 0;
    }
  }

  static from(value: DateVersionDurationLike): DateVersionDuration {
    if (value instanceof DateVersionDuration) {
      return value;
    }

    if (typeof value === 'object' && value) {
      return new DateVersionDuration({
        year: value.year ?? undefined,
        month: value.month ?? undefined,
        day: value.day ?? undefined,
        hour: value.hour ?? undefined,
        minute: value.minute ?? undefined,
        second: value.second ?? undefined,
      });
    }

    if (typeof value === 'string') {
      const expr = parse(value);

      if (typeof expr !== 'object' || !expr || expr.type !== 'IDENTITY_EXPR' || expr.value.type !== 'DURATION') {
        throw new DateverParserError('Input string is not a version value.');
      }

      return new DateVersionDuration({
        year: expr.value.Y ?? undefined,
        month: expr.value.M ?? undefined,
        day: expr.value.D ?? undefined,
        hour: expr.value.h ?? undefined,
        minute: expr.value.m ?? undefined,
        second: expr.value.s ?? undefined,
      });
    }

    throw new DateverError('Invalid value type for a date version duration.');
  }
}
