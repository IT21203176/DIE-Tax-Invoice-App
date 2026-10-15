export const DEFAULT_VAT_RATE = 18;

export function round2(value) {
  const n = Number(value) || 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Same as the Excel formula =ROUND(amountIncludingVat/118%,0) when the VAT rate is 18%.
export function unitPriceFromVatInclusive(amountIncludingVat, vatRate = DEFAULT_VAT_RATE) {
  const amount = Number(amountIncludingVat) || 0;
  return Math.round(round2((amount * 100) / (100 + vatRate)));
}

export function computeTotals(items = [], vatRate = DEFAULT_VAT_RATE) {
  const computedItems = items.map((item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = round2(item.unitPrice);
    return { ...item, quantity, unitPrice, amount: round2(quantity * unitPrice) };
  });

  const totalValueOfSupply = round2(
    computedItems.reduce((sum, item) => sum + item.amount, 0)
  );
  // VAT is rounded to whole rupees, same as the Excel formula =ROUND(supply*0.18,0).
  const vatAmount = Math.round(round2((totalValueOfSupply * vatRate) / 100));
  const totalAmountIncludingVat = round2(totalValueOfSupply + vatAmount);

  return {
    items: computedItems,
    vatRate,
    totalValueOfSupply,
    vatAmount,
    totalAmountIncludingVat,
    totalAmountInWords: amountToWords(totalAmountIncludingVat),
  };
}

const ONES = [
  '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
  'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN',
  'SEVENTEEN', 'EIGHTEEN', 'NINETEEN',
];
const TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
const SCALES = ['', 'THOUSAND', 'MILLION', 'BILLION', 'TRILLION'];

function belowHundred(n) {
  if (n < 20) return ONES[n];
  return [TENS[Math.floor(n / 10)], ONES[n % 10]].filter(Boolean).join(' ');
}

function belowThousand(n) {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (!hundreds) return belowHundred(rest);
  if (!rest) return `${ONES[hundreds]} HUNDRED`;
  return `${ONES[hundreds]} HUNDRED & ${belowHundred(rest)}`;
}

// British style, e.g. 5,350,000 -> "FIVE MILLION THREE HUNDRED & FIFTY THOUSAND"
export function integerToWords(value) {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return 'ZERO';

  const groups = [];
  let scale = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk) groups.unshift({ chunk, scale, words: [belowThousand(chunk), SCALES[scale]].filter(Boolean).join(' ') });
    n = Math.floor(n / 1000);
    scale += 1;
  }

  return groups
    .map((group, index) =>
      index > 0 && group.scale === 0 && group.chunk < 100 ? `& ${group.words}` : group.words
    )
    .join(' ');
}

export function amountToWords(amount) {
  const rounded = round2(amount);
  const rupees = Math.floor(rounded);
  const cents = Math.round((rounded - rupees) * 100);

  let words = integerToWords(rupees);
  if (cents > 0) words += ` AND CENTS ${integerToWords(cents)}`;
  return `${words} ONLY`;
}

export function formatMoney(value) {
  return round2(value).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
