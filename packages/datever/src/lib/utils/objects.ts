export function lastSatisfying<T, R = T>(
  values: T[] | Iterator<T>,
  satisfies: (value: T) => boolean,
  select: (values: T[]) => R,
): R | undefined {
  values = Array.isArray(values) ? values[Symbol.iterator]() : values;
  let result: R | undefined;

  for (let next = values.next(); !next.done; next = values.next()) {
    if (satisfies(next.value)) {
      result = result ? select([result, next.value]) : select([next.value]);
    }
  }

  return result;
}
