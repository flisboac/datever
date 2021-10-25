import { DateverError } from '../common/types';

export class DateverLogicError extends DateverError {
  constructor(contents?: string | Omit<DateverLogicError, 'name'> | SyntaxError, cause?: any) {
    super(typeof contents === 'string' ? contents : contents.message, cause);
  }
}
