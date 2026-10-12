import * as React from "react";
import { Input, type InputProps } from "../input";

export interface MoneyInputProps extends Omit<InputProps, 'type' | 'value' | 'onChange'> {
  value?: number; // kobo
  onChange?: (kobo: number | null) => void;
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(() => {
      if (value !== undefined) {
        return (value / 100).toFixed(2);
      }
      return '';
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value.replace(/[^\d.]/g, '');
      
      // Allow only one decimal point
      const parts = input.split('.');
      if (parts.length > 2) return;
      
      // Limit to 2 decimal places
      if (parts[1] && parts[1].length > 2) return;
      
      setDisplayValue(input);
      
      if (onChange) {
        if (input === '' || input === '.') {
          onChange(null);
        } else {
          const naira = parseFloat(input);
          if (!isNaN(naira)) {
            onChange(Math.round(naira * 100));
          }
        }
      }
    };

    const handleBlur = () => {
      if (displayValue && !displayValue.endsWith('.')) {
        const naira = parseFloat(displayValue);
        if (!isNaN(naira)) {
          setDisplayValue(naira.toFixed(2));
        }
      }
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
