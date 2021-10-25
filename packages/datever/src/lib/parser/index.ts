import { DateverParserError } from './types';
import { OperationExprNode, parse as rawParse } from './rawParser';

export function parse(input: string): OperationExprNode {
  try {
    return rawParse(input);
  } catch (error) {
    throw new DateverParserError(error);
  }
}
