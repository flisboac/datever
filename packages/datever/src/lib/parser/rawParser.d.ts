import { ParserExpectation, ParserLocation } from '..';
import { LowerBoundedRangeAnchorType, UpperBoundedRangeAnchorType } from '../common/types';
import type { ParserExprOperator, ParserNodeType } from './rawParser.types';

export interface BaseParserNode {
  type: ParserNodeType;
}

export interface IdentityExprNode extends BaseParserNode {
  type: ParserNodeType.IDENTITY_EXPR;
  value: ValueExprNode;
}

export interface MultiOperandExprNode extends BaseParserNode {
  type: ParserNodeType.MULTI_OPERAND_EXPR;
  operator: ParserExprOperator;
  operands: Array<ValueExprNode>;
}

export interface DurationValueNode extends BaseParserNode {
  type: ParserNodeType.DURATION;
  Y?: number | null;
  M?: number | null;
  D?: number | null;
  h?: number | null;
  m?: number | null;
  s?: number | null;
}

export interface VersionValueNode extends BaseParserNode {
  type: ParserNodeType.VERSION;
  Y: number;
  M: number;
  D: number;
  h: number;
  m: number;
  s: number;
  u?: number;
}

export interface YearRangeValueNode extends BaseParserNode {
  type: ParserNodeType.YEAR_RANGE;
  Y: number;
}

export interface MonthRangeValueNode extends BaseParserNode {
  type: ParserNodeType.MONTH_RANGE;
  Y: number;
  M: number;
}

export interface DayRangeValueNode extends BaseParserNode {
  type: ParserNodeType.DAY_RANGE;
  Y: number;
  M: number;
  D: number;
}

export interface HourRangeValueNode extends BaseParserNode {
  type: ParserNodeType.HOUR_RANGE;
  Y: number;
  M: number;
  D: number;
  h: number;
}

export interface MinuteRangeValueNode extends BaseParserNode {
  type: ParserNodeType.MINUTE_RANGE;
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
  type: ParserNodeType.CLOSE_BOUNDED_RANGE;
  lower: BriefRangeValueNode;
  upper: BriefRangeValueNode;
}

export interface LowerBoundedRangeValueNode extends BaseParserNode {
  type: ParserNodeType.LOWER_BOUNDED_RANGE;
  lower: BriefRangeValueNode;
  anchor: LowerBoundedRangeAnchorType;
}

export interface UpperBoundedRangeValueNode extends BaseParserNode {
  type: ParserNodeType.UPPER_BOUNDED_RANGE;
  upper: BriefRangeValueNode;
  anchor: UpperBoundedRangeAnchorType;
}

export interface LowerDurationRangeValueNode extends BaseParserNode {
  type: ParserNodeType.LOWER_DURATION_RANGE;
  lower: BriefRangeValueNode;
  duration: DurationValueNode;
}

export interface UpperDurationRangeValueNode extends BaseParserNode {
  type: ParserNodeType.UPPER_DURATION_RANGE;
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
export type ValueExprNode = ConstantExprNode | RangeExprNode;

export type OperationExprNode = IdentityExprNode | MultiOperandExprNode;

export type ParserNode = OperationExprNode | ConstantExprNode;

export declare function parse(input: string): OperationExprNode;

export declare class SyntaxError extends Error {
  readonly expected: string | ParserExpectation[] | null;
  readonly found: string | null;
  readonly location: ParserLocation;
}
