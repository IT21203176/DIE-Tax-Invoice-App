import { useLayoutEffect, useRef } from 'react';

const MONEY_CHARS = /[\d.]/;

// Keeps only digits and a single decimal point with at most 2 decimals, e.g. "4,533,898.5x" -> "4533898.5".
function sanitize(text) {
  let digits = text.replace(/[^\d.]/g, '');
  const dot = digits.indexOf('.');
  if (dot !== -1) {
    digits = digits.slice(0, dot + 1) + digits.slice(dot + 1).replace(/\./g, '').slice(0, 2);
  }
  return digits.replace(/^0+(?=\d)/, '');
}

export function formatMoneyInput(raw) {
  if (raw === '' || raw == null) return '';
  const [intPart, decPart] = String(raw).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart === undefined ? grouped : `${grouped || '0'}.${decPart}`;
}

export default function MoneyInput({ value, onChange, onBlur, ...props }) {
  const inputRef = useRef(null);
  const caretRef = useRef(null);
  const display = formatMoneyInput(value);

  // Restore the caret after commas are inserted/removed so typing in the middle of a number works.
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (caretRef.current == null || document.activeElement !== input) return;
    const target = caretRef.current;
    caretRef.current = null;

    let seen = 0;
    let position = 0;
    while (position < display.length && seen < target) {
      if (MONEY_CHARS.test(display[position])) seen += 1;
      position += 1;
    }
    input.setSelectionRange(position, position);
  });

  function handleChange(event) {
    const { value: typed, selectionStart } = event.target;
    caretRef.current = typed.slice(0, selectionStart).replace(/[^\d.]/g, '').length;
    onChange(sanitize(typed));
  }

  function handleBlur(event) {
    if (value !== '' && value != null && Number.isFinite(Number(value))) {
      const fixed = Number(value).toFixed(2);
      if (fixed !== String(value)) onChange(fixed);
    }
    onBlur?.(event);
  }

  return (
    <input
      {...props}
      ref={inputRef}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={['money', props.className].filter(Boolean).join(' ')}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
