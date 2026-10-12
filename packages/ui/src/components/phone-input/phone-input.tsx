import * as React from "react";
import { Input, type InputProps } from "../input";

export interface PhoneInputProps extends Omit<InputProps, 'type' | 'value' | 'onChange'> {
  value?: string;
  onChange?: (phone: string) => void;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value = '', onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(value);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let input = e.target.value.replace(/\D/g, '');
      
      // Auto-format as user types
      let formatted = input;
      
      if (input.startsWith('234')) {
        // +234 format
        if (input.length > 3) {
          formatted = `+234 ${input.slice(3, 6)}`;
          if (input.length > 6) {
            formatted += ` ${input.slice(6, 9)}`;
          }
          if (input.length > 9) {
            formatted += ` ${input.slice(9, 13)}`;
          }
        }
      } else if (input.startsWith('0')) {
        // 0 format
        if (input.length > 4) {
          formatted = `${input.slice(0, 4)} ${input.slice(4, 7)}`;
          if (input.length > 7) {
            formatted += ` ${input.slice(7, 11)}`;
          }
        } else {
          formatted = input;
        }
      } else if (input.length > 0) {
        // Assume Nigerian and prepend 0
        input = '0' + input;
        formatted = input;
        if (input.length > 4) {
          formatted = `${input.slice(0, 4)} ${input.slice(4, 7)}`;
          if (input.length > 7) {
            formatted += ` ${input.slice(7, 11)}`;
          }
        }
      }
      
      setDisplayValue(formatted);
      
      if (onChange) {
        // Return normalized format
        const cleaned = formatted.replace(/\D/g, '');
        if (cleaned.startsWith('234') && cleaned.length <= 13) {
          onChange(`+${cleaned}`);
        } else if (cleaned.startsWith('0') && cleaned.length <= 11) {
          onChange(cleaned);
        } else if (cleaned.length <= 10) {
          onChange(cleaned);
        }
      }
    };

    React.useEffect(() => {
      setDisplayValue(value);
    }, [value]);

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
