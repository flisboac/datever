import { DateverError } from '../common/types';
import { SyntaxError } from './rawParser';
import { ParserExpectation, ParserLocation } from './rawParser.types';

export class DateverParserError extends DateverError {
  readonly expected?: string | ParserExpectation[] | null;
  readonly found?: string | null;
  readonly location?: ParserLocation;
  readonly cause?: any;

  constructor(contents?: string | Omit<DateverParserError, 'name'> | SyntaxError, cause?: any) {
    super(typeof contents === 'string' ? contents : contents.message, cause);
    if (typeof contents === 'object' && contents) {
      this.expected = contents.expected;
      this.found = contents.found;
      this.location = contents.location;

      if (contents instanceof SyntaxError) {
        this.cause = this.cause ?? contents;
      } else {
        this.cause = this.cause ?? contents.cause;
      }
    }
  }
}
