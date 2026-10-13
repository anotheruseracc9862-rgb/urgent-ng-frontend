import * as React from "react";
import { formatMoneyInput, parseMoneyToKobo } from "@urgent/utils";
import { Input, type InputProps } from "../input";

export interface MoneyInputProps extends Omit<InputProps, 'type' | 'value' | 'onChange'> {
  value?: number | null; // kobo
  onChange?: (kobo: number | null) => void;
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onChange, onBlur, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(() =>
      value === undefined || value === null ? "" : formatMoneyInput(value),
    );
    const lastEmittedValue = React.useRef<number | null | undefined>(value);

    React.useEffect(() => {
      if (value !== lastEmittedValue.current) {
        lastEmittedValue.current = value;
        setDisplayValue(value === undefined || value === null ? "" : formatMoneyInput(value));
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      const parsed = input.trim() ? parseMoneyToKobo(input) : null;
      setDisplayValue(input);
      lastEmittedValue.current = parsed ?? null;
      onChange?.(parsed);
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      const parsed = parseMoneyToKobo(displayValue);
      if (parsed !== null) setDisplayValue(formatMoneyInput(parsed));
      onBlur?.(event);
    };

    return (
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold">
          ₦
        </span>
        <Input
          ref={ref}
          type="text"
          inputMode="decimal"
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
