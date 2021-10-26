import { LowerBoundedRangeAnchorType, UpperBoundedRangeAnchorType } from '../common/types';
import type { ParserExpectation, ParserExprOperator, ParserLocation, ParserNodeType } from './rawParser.types';

export interface BaseParserNode {
  type: ParserNodeType;
}

export interface IdentityExprNode extends BaseParserNode {
  type: 'IDENTITY_EXPR';
  value: ValueExprNode;
}

export interface MultiOperandExprNode extends BaseParserNode {
  type: 'MULTI_OPERAND_EXPR';
  operator: ParserExprOperator;
  operands: Array<ValueExprNode>;
}

export interface DurationValueNode extends BaseParserNode {
  type: 'DURATION';
  Y?: number | null;
  M?: number | null;
  D?: number | null;
  h?: number | null;
  m?: number | null;
  s?: number | null;
}

export interface VersionValueNode extends BaseParserNode {
  type: 'VERSION';
  Y: number;
  M: number;
  D: number;
  h: number;
  m: number;
  s: number;
  u?: number;
}

export interface YearRangeValueNode extends BaseParserNode {
  type: 'YEAR_RANGE';
  Y: number;
}

export interface MonthRangeValueNode extends BaseParserNode {
  type: 'MONTH_RANGE';
  Y: number;
  M: number;
}

export interface DayRangeValueNode extends BaseParserNode {
  type: 'DAY_RANGE';
  Y: number;
  M: number;
  D: number;
}

export interface HourRangeValueNode extends BaseParserNode {
  type: 'HOUR_RANGE';
  Y: number;
  M: number;
  D: number;
  h: number;
}

export interface MinuteRangeValueNode extends BaseParserNode {
  type: 'MINUTE_RANGE';
  Y: number;
  M: number;
  D: number;
  h: number;
  m: number;
}

export type BriefRangeValueNode =
  | VersionValueNode
  | YearRangeValueNode
  | MonthRangeValueNode
  | DayRangeValueNode
  | HourRangeValueNode
  | MinuteRangeValueNode;

export interface CloseBoundedRangeValueNode extends BaseParserNode {
  type: 'FULLY_BOUNDED_RANGE';
  lower: LowerBoundedRangeValueNode;
  upper: UpperBoundedRangeValueNode;
}

export interface LowerBoundedRangeValueNode extends BaseParserNode {
  type: 'LOWER_BOUNDED_RANGE';
  lower: BriefRangeValueNode;
  anchor: LowerBoundedRangeAnchorType;
}

export interface UpperBoundedRangeValueNode extends BaseParserNode {
  type: 'UPPER_BOUNDED_RANGE';
  upper: BriefRangeValueNode;
  anchor: UpperBoundedRangeAnchorType;
}

export interface LowerDurationRangeValueNode extends BaseParserNode {
  type: 'LOWER_DURATION_RANGE';
  lower: BriefRangeValueNode;
  duration: DurationValueNode;
}

export interface UpperDurationRangeValueNode extends BaseParserNode {
  type: 'UPPER_DURATION_RANGE';
  upper: BriefRangeValueNode;
  duration: DurationValueNode;
}

export type DetailedRangeValueNode =
  | CloseBoundedRangeValueNode
  | LowerBoundedRangeValueNode
  | UpperBoundedRangeValueNode
  | LowerDurationRangeValueNode
  | UpperDurationRangeValueNode;

export type ConstantExprNode = VersionValueNode;
export type RangeExprNode = BriefRangeValueNode | DetailedRangeValueNode;
export type ValueExprNode = ConstantExprNode | RangeExprNode | DurationValueNode;

export type OperationExprNode = IdentityExprNode | MultiOperandExprNode;

export type ParserNode = OperationExprNode | ConstantExprNode;

export declare function parse(input: string): OperationExprNode;

export declare class SyntaxError extends Error {
  readonly expected: string | ParserExpectation[] | null;
  readonly found: string | null;
  readonly location: ParserLocation;
}
