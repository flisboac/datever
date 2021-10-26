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

export type ParserNodeType =
  | 'IDENTITY_EXPR'
  | 'MULTI_OPERAND_EXPR'
  | 'VERSION'
  | 'YEAR_RANGE'
  | 'MONTH_RANGE'
  | 'DAY_RANGE'
  | 'HOUR_RANGE'
  | 'MINUTE_RANGE'
  | 'LOWER_BOUNDED_RANGE'
  | 'UPPER_BOUNDED_RANGE'
  | 'FULLY_BOUNDED_RANGE'
  | 'LOWER_DURATION_RANGE'
  | 'UPPER_DURATION_RANGE'
  | 'DURATION';

export type ParserExprOperator = 'OR';
