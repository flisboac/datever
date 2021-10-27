import { DateverParserError } from '..';
import { parse } from '../parser/functions';
import { IdentityExprNode, ValueExprNode } from '../parser/rawParser';
import { lastSatisfying } from '../utils/objects';
import { DateVersionRange } from './range';
import { DateverLogicError } from './types';
import { extractBriefVersionRangeAnchorsData } from './utils';
import { DateVersion, DateVersionLike } from './version';

export type DateVersionSpecLike = DateVersionSpec | DateVersionSpecProps | string;

export interface DateVersionSpecProps {
  ranges: DateVersionRange[];
}

const extractRange = (expr: IdentityExprNode | ValueExprNode): DateVersionRange => {
  const { lower, upper } = extractBriefVersionRangeAnchorsData(expr);
  return DateVersionRange.from({ lower, upper });
};

export class DateVersionSpec {
  readonly ranges: DateVersionRange[];

  private constructor(values: DateVersionSpec | DateVersionSpecProps) {
    this.ranges = values.ranges;
  }

  static from(value: DateVersionSpecLike): DateVersionSpec {
    if (value instanceof DateVersionSpec) {
      return value;
    }

    let ranges: DateVersionRange[] = [];

    if (typeof value === 'object' && value) {
      ranges = ranges.concat(value.ranges);
    } else if (typeof value === 'string') {
      const expr = parse(value);

      if (typeof expr !== 'object' || !expr) {
        throw new DateverParserError('Input string is not a version spec value.');
      }

      if (expr.type === 'MULTI_OPERAND_EXPR') {
        if (expr.operator !== 'OR') {
          throw new DateverParserError('Invalid logical operator for a date version spec.');
        }

        ranges = expr.operands.map(extractRange);
      } else if (expr.type === 'IDENTITY_EXPR') {
        ranges.push(extractRange(expr.value));
      } else {
        throw new DateverParserError('Invalid parser node for a date version spec.');
      }
    }

    if (ranges.length === 0) {
      throw new DateverLogicError('Date version spec cannot be empty.');
    }

    return new DateVersionSpec({ ranges });
  }

  includes(_rhs: DateVersionLike): boolean {
    const rhs = DateVersion.from(_rhs);
    return this.ranges.some(range => range.includes(rhs));
  }

  maxSatisfying(_versions: DateVersionLike[] | Iterator<DateVersionLike>): DateVersion | undefined {
    return lastSatisfying(_versions, version => this.includes(version), DateVersion.max);
  }

  minSatisfying(_versions: DateVersionLike[] | Iterator<DateVersionLike>): DateVersion | undefined {
    return lastSatisfying(_versions, version => this.includes(version), DateVersion.min);
  }
}
