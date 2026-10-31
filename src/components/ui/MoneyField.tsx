import { forwardRef } from 'react';
import { TextField, type TextFieldProps } from './Field';

/** Rupee amount input (text, so no float rounding). Value is a string like "12000.50". */
export const MoneyField = forwardRef<HTMLInputElement, TextFieldProps>(
  function MoneyField(props, ref) {
    return (
      <TextField ref={ref} inputMode="decimal" placeholder="0.00" autoComplete="off" {...props} />
    );
  },
);
