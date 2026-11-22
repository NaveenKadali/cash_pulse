// Money is integer paise (1 INR = 100 paise) held as bigint. Never use floats.

export type Paise = bigint & { readonly __brand: 'Paise' };

export function paise(value: bigint | number): Paise {
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      throw new Error(`paise() requires an integer number, got ${value}`);
    }
    return BigInt(value) as Paise;
  }
  return value as Paise;
}

export function addPaise(a: Paise, b: Paise): Paise {
  return (a + b) as Paise;
}

export function subPaise(a: Paise, b: Paise): Paise {
  return (a - b) as Paise;
}

export function comparePaise(a: Paise, b: Paise): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

const inrIntegerFormat = new Intl.NumberFormat('en-IN');

export function formatInr(p: Paise): string {
  const negative = p < 0n;
  const abs = negative ? -p : p;
  const rupees = abs / 100n;
  const fraction = (abs % 100n).toString().padStart(2, '0');
  const sign = negative ? '-' : '';
  return `${sign}₹${inrIntegerFormat.format(rupees)}.${fraction}`;
}

const RUPEE_PATTERN = /^(\d+)(?:\.(\d{1,2}))?$/;

export function parseRupeesToPaise(input: string): Paise {
  const match = RUPEE_PATTERN.exec(input);
  if (!match) {
    throw new Error(
      `Invalid rupee amount "${input}": expected digits with at most two decimals`,
    );
  }
  const whole = BigInt(match[1] as string);
  const fraction = BigInt((match[2] ?? '0').padEnd(2, '0'));
  return (whole * 100n + fraction) as Paise;
}
