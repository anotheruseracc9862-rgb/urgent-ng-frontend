import * as React from "react";
import { formatPhone, normalizePhone } from "@urgent/utils";
import { Input, type InputProps } from "../input";

export interface PhoneInputProps extends Omit<InputProps, 'type' | 'value' | 'onChange'> {
  value?: string;
  onChange?: (phone: string) => void;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value = '', onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(() => formatPhone(value) ?? value);
    const lastEmittedValue = React.useRef(value);

    React.useEffect(() => {
      if (value !== lastEmittedValue.current) {
        lastEmittedValue.current = value;
        setDisplayValue(formatPhone(value) ?? value);
      }
    }, [value]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.target.value;
      const normalized = normalizePhone(input);
      setDisplayValue(formatPhone(input) ?? input);
      lastEmittedValue.current = normalized ?? input;
      onChange?.(normalized ?? input);
    };

    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="tel"
        value={displayValue}
        onChange={handleChange}
        placeholder="0803 456 7890"
        maxLength={18}
        {...props}
      />
    );
  }
);

PhoneInput.displayName = "PhoneInput";
