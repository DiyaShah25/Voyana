const aliases: Record<string, string> = { denpasar: 'bali', fira: 'santorini', thira: 'santorini', nyc: 'new york', 'new york city': 'new york', bombay: 'mumbai' };

export function destinationKey(value: string): string {
  const key = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').split(',')[0].trim().toLowerCase().replace(/\s+/g, ' ');
  return aliases[key] || key;
}
