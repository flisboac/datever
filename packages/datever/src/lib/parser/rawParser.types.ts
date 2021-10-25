export interface ParserPosition {
  offset: number;
  line: number;
  column: number;
}

export interface ParserExpectation {
  type: string;
  description?: string;
}

export interface ParserLocation {
  source: string;
  start: ParserPosition;
  end: ParserPosition;
}

export enum ParserNodeType {
  IDENTITY_EXPR = 'IDENTITY_EXPR',
  MULTI_OPERAND_EXPR = 'MULTI_OPERAND_EXPR',
  VERSION = 'VERSION',
  YEAR_RANGE = 'YEAR_RANGE',
  MONTH_RANGE = 'MONTH_RANGE',
  DAY_RANGE = 'DAY_RANGE',
  HOUR_RANGE = 'HOUR_RANGE',
  MINUTE_RANGE = 'MINUTE_RANGE',
  LOWER_BOUNDED_RANGE = 'LOWER_BOUNDED_RANGE',
  UPPER_BOUNDED_RANGE = 'UPPER_BOUNDED_RANGE',
  CLOSE_BOUNDED_RANGE = 'CLOSE_BOUNDED_RANGE',
  LOWER_DURATION_RANGE = 'LOWER_DURATION_RANGE',
  UPPER_DURATION_RANGE = 'UPPER_DURATION_RANGE',
  DURATION = 'DURATION',
}

export enum ParserExprOperator {
  OR = 'OR',
}
