import { DateVersionDuration } from './duration';
import { DurationValueNode, IdentityExprNode, ValueExprNode } from '../parser/rawParser';
import { DateverParserError } from '../parser/types';
import { DateVersion } from './version';

interface DateVersionRangeAnchor_ {
  version: DateVersion;
  open: boolean;
}

interface DateVersionRangeProps_ {
  lower: DateVersionRangeAnchor_;
  upper: DateVersionRangeAnchor_;
}

const openOperators = ['GT', 'LT'];

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

export function extractEpoch(expr: ValueExprNode): number {
  if (expr.type === 'VERSION') {
    return Date.UTC(expr.Y, expr.M - 1, expr.D, expr.h, expr.m, expr.s);
  }

  throw new DateverParserError('Invalid date version expression.');
}

export function extractBriefVersionRangeAnchorsData(expr: IdentityExprNode | ValueExprNode): DateVersionRangeProps_ {
  return doExtractBriefVersionRangeAnchorsData(expr);
}

function doExtractBriefVersionRangeAnchorsData(
  expr: IdentityExprNode | ValueExprNode,
  minimum = false,
): DateVersionRangeProps_ {
  let lower: DateVersionRangeAnchor_;
  let upper: DateVersionRangeAnchor_;

  switch (expr.type) {
    case 'IDENTITY_EXPR':
      return doExtractBriefVersionRangeAnchorsData(expr.value, minimum);
    case 'VERSION':
      const value = DateVersion.from(extractEpoch(expr));
      lower = { version: value, open: false };
      upper = { version: value, open: false };
      break;

    case 'YEAR_RANGE':
      lower = {
        version: DateVersion.from(new Date(Date.UTC(expr.Y, 0, 1, 0, 0, 0))),
        open: false,
      };
      upper = {
        version: !minimum
          ? DateVersion.from(new Date(Date.UTC(expr.Y, 11, 31, 23, 59, 59)))
          : DateVersion.from(new Date(Date.UTC(expr.Y, 0, 1, 0, 0, 0))),
        open: minimum,
      };
      break;

    case 'MONTH_RANGE':
      lower = {
        version: DateVersion.from(new Date(Date.UTC(expr.Y, expr.M - 1, 1, 0, 0, 0))),
        open: false,
      };
      upper = {
        version: !minimum
          ? DateVersion.from(new Date(Date.UTC(expr.Y, expr.M - 1, 31, 23, 59, 59)))
          : DateVersion.from(new Date(Date.UTC(expr.Y, expr.M - 1, 1, 0, 0, 0))),
        open: minimum,
      };
      break;

    case 'DAY_RANGE':
      lower = {
        version: DateVersion.from(new Date(Date.UTC(expr.Y, expr.M - 1, expr.D, 0, 0, 0))),
        open: false,
      };
      upper = {
        version: !minimum
          ? DateVersion.from(new Date(Date.UTC(expr.Y, expr.M - 1, expr.D, 23, 59, 59)))
          : DateVersion.from(new Date(Date.UTC(expr.Y, expr.M - 1, expr.D, 0, 0, 0))),
        open: minimum,
      };
      break;

    case 'HOUR_RANGE':
      lower = {
        version: DateVersion.from(new Date(Date.UTC(expr.Y, expr.M - 1, expr.D, expr.h, 0, 0))),
        open: false,
      };
      upper = {
        version: !minimum
          ? DateVersion.from(new Date(Date.UTC(expr.Y, expr.M - 1, expr.D, expr.h, 59, 59)))
          : DateVersion.from(new Date(Date.UTC(expr.Y, expr.M - 1, expr.D, expr.h, 0, 0))),
        open: minimum,
      };
      break;

    case 'MINUTE_RANGE':
      lower = {
        version: DateVersion.from(new Date(Date.UTC(expr.Y, expr.M - 1, expr.D, expr.h, expr.m, 0))),
        open: false,
      };
      upper = {
        version: !minimum
          ? DateVersion.from(new Date(Date.UTC(expr.Y, expr.M - 1, expr.D, expr.h, expr.m, 59)))
          : DateVersion.from(new Date(Date.UTC(expr.Y, expr.M - 1, expr.D, expr.h, expr.m, 0))),
        open: minimum,
      };
      break;

    case 'FULLY_BOUNDED_RANGE':
      {
        lower = {
          version: doExtractBriefVersionRangeAnchorsData(expr.lower.lower).lower.version,
          open: openOperators.includes(expr.lower.anchor),
        };
        const isUpperOpen = openOperators.includes(expr.upper.anchor);
        upper = {
          version: doExtractBriefVersionRangeAnchorsData(expr.upper.upper, isUpperOpen).upper.version,
          open: isUpperOpen,
        };
      }
      break;

    case 'LOWER_BOUNDED_RANGE':
      {
        const open = openOperators.includes(expr.anchor);
        const limits = doExtractBriefVersionRangeAnchorsData(expr.lower);
        const value = open
          ? //  e.g. ">  2020"  ===  ">  2020-12-31T23:59:59"   ( internally, ">=  2021-01-01T00:00:00" )
            limits.upper.version
          : //  e.g. ">= 2020"  ===  ">= 2020-01-01T00:00:00"
            limits.lower.version;
        lower = { version: value, open: open };
      }
      break;

    case 'UPPER_BOUNDED_RANGE':
      {
        const open = openOperators.includes(expr.anchor);
        const limits = doExtractBriefVersionRangeAnchorsData(expr.upper);
        const value = open
          ? //  e.g. "<  2020"  ===  "<  2020-01-01T00:00:00"  ( internally, "<=  2019-12-31T23:59:59" )
            limits.lower.version
          : //  e.g. "<= 2020"  ===  "<= 2020-12-31T23:59:59"
            limits.upper.version;
        upper = { version: value, open: open };
      }
      break;

    case 'LOWER_DURATION_RANGE':
      {
        const limits = doExtractBriefVersionRangeAnchorsData(expr.lower);
        const duration = createDuration(expr.duration);
        const value = lower.version.addDuration(duration);
        lower = limits.lower;
        upper = { version: value, open: false };
      }
      break;

    case 'UPPER_DURATION_RANGE':
      {
        const limits = doExtractBriefVersionRangeAnchorsData(expr.upper);
        const duration = createDuration(expr.duration);
        const value = upper.version.minusDuration(duration);
        upper = limits.upper;
        lower = { version: value, open: false };
      }
      break;

    default:
      throw new DateverParserError('Input string is not valid.');
  }

  return { lower, upper };
}
