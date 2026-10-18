import * as React from "react";
import { e164ToLocalPhone, localPhoneToE164 } from "@urgent/utils";
import { Input, type InputProps } from "../input";

export interface PhoneInputProps extends Omit<InputProps, 'type' | 'value' | 'onChange'> {
  value?: string;
  onChange?: (phone: string) => void;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value = '', onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(() => e164ToLocalPhone(value));
    const lastEmittedValue = React.useRef(value);

    React.useEffect(() => {
      if (value !== lastEmittedValue.current) {
        lastEmittedValue.current = value;
        setDisplayValue(e164ToLocalPhone(value));
      }
    }, [value]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.target.value;
      // Only the local format (08031234567) is accepted; it is emitted as +234... . Anything else
      // is emitted as typed so the form's validation can refuse it.
      const normalized = localPhoneToE164(input);
      setDisplayValue(input);
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
        placeholder="08031234567"
        maxLength={11}
        {...props}
      />
    );
  }
);

PhoneInput.displayName = "PhoneInput";
