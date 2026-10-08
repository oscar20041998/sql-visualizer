export type NamingStrategy = 'camelCase' | 'pascalCase' | 'preserve';

export function toJavaIdentifier(identifier: string, strategy: NamingStrategy): string {
  if (strategy === 'preserve') return identifier;

  const words = identifier.match(/[A-Z]+(?=[A-Z][a-z]|[0-9]|_|$)|[A-Z]?[a-z]+|[0-9]+/g);
  if (!words?.length) return identifier;

  const normalized = words.map((word) => word.toLowerCase());
  const firstWord =
    strategy === 'pascalCase'
      ? `${normalized[0][0].toUpperCase()}${normalized[0].slice(1)}`
      : normalized[0];
  const remainingWords = normalized
    .slice(1)
    .map((word) => `${word[0].toUpperCase()}${word.slice(1)}`);
  const converted = [firstWord, ...remainingWords].join('');
  return /^[0-9]/.test(converted) ? `_${converted}` : converted;
}
