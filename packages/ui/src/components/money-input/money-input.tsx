import * as React from "react";
import { formatMoneyInput, parseMoneyToKobo } from "@urgent/utils";
import { Input, type InputProps } from "../input";

export interface MoneyInputProps extends Omit<InputProps, 'type' | 'value' | 'onChange'> {
  value?: number | null; // kobo
  onChange?: (kobo: number | null) => void;
  /** Accept kobo (two decimals). Turn off for whole-naira amounts; a typed "." is ignored. */
  allowKobo?: boolean;
}

/**
 * Add thousands separators while the person types. Text that is not a plain amount
 * (for example three decimals) is left as typed, so the parser can reject it.
 */
function groupWhileTyping(raw: string, allowKobo: boolean): string {
  const bare = raw.replace(/^₦\s*/, '').replace(/[,\s]/g, '');
  const match = /^(\d*)(\.\d{0,2})?$/.exec(bare);
  if (!match) return raw;
  const whole = (match[1] ?? '').replace(/^0+(?=\d)/, '');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${grouped}${allowKobo ? match[2] ?? '' : ''}`;
}

/** The caret index in `text` that sits after the same number of digits and dots as before. */
function caretAfter(text: string, significant: number): number {
  if (significant <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (/[\d.]/.test(text[index]!)) seen += 1;
    if (seen === significant) return index + 1;
  }
  return text.length;
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onChange, onBlur, allowKobo = true, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null);
    const pendingCaret = React.useRef<number | null>(null);
    const show = (kobo: number | null | undefined) =>
      kobo === undefined || kobo === null ? "" : allowKobo ? formatMoneyInput(kobo) : formatMoneyInput(kobo).replace(/\.00$/, "");
    const [displayValue, setDisplayValue] = React.useState(() => show(value));
    const lastEmittedValue = React.useRef<number | null | undefined>(value);

    const setRefs = (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    };

    React.useEffect(() => {
      if (value !== lastEmittedValue.current) {
        lastEmittedValue.current = value;
        setDisplayValue(show(value));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    React.useLayoutEffect(() => {
      if (pendingCaret.current === null) return;
      innerRef.current?.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }, [displayValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const typed = e.target.value;
      const input = groupWhileTyping(typed, allowKobo);
      const caret = e.target.selectionStart ?? typed.length;
      const significant = typed.slice(0, caret).replace(/[^\d.]/g, '').length;
      pendingCaret.current = caretAfter(input, significant);
      const parsed = input.trim() ? parseMoneyToKobo(input) : null;
      setDisplayValue(input);
      lastEmittedValue.current = parsed ?? null;
      onChange?.(parsed);
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      const parsed = parseMoneyToKobo(displayValue);
      if (parsed !== null) setDisplayValue(show(parsed));
      onBlur?.(event);
    };

    return (
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold">
          ₦
        </span>
        <Input
          ref={setRefs}
          type="text"
          inputMode={allowKobo ? "decimal" : "numeric"}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className="pl-8"
          {...props}
        />
      </div>
    );
  }
);

MoneyInput.displayName = "MoneyInput";
