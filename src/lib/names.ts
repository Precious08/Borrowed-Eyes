export function isNameComplete(value: string): boolean {
  return value.trim().length > 0;
}

export function bothNamesComplete(names: readonly [string, string]): boolean {
  return isNameComplete(names[0]) && isNameComplete(names[1]);
}
