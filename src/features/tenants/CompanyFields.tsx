import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { FieldGrid, SectionTitle, SelectField, TextField } from '@/components/ui/Field';
import { INDIAN_STATES } from '@/lib/indian-states';
import type { CompanyFormValues } from './schemas';

interface Props {
  register: UseFormRegister<CompanyFormValues>;
  errors: FieldErrors<CompanyFormValues>;
  disabled?: boolean;
  /** Onboarding only asks for the essentials; settings shows everything. */
  variant?: 'onboarding' | 'full';
}

export function CompanyFields({ register, errors, disabled, variant = 'full' }: Props) {
  const full = variant === 'full';
  return (
    <fieldset disabled={disabled} className="flex flex-col gap-6">
      <div>
        <SectionTitle>Business details</SectionTitle>
        <FieldGrid>
          <TextField
            label="Company display name"
            required
            placeholder="e.g. Deccan Roadways Co."
            error={errors.name?.message}
            {...register('name')}
          />
          <TextField
            label="Legal name"
            placeholder="As registered"
            hint="Shown on invoices if different from the display name."
            error={errors.legalName?.message}
            {...register('legalName')}
          />
          <TextField
            label="GSTIN"
            maxLength={15}
            placeholder="15-character GSTIN"
            className="uppercase"
            hint="Optional. Format is checked; registration is not verified."
            error={errors.gstin?.message}
            {...register('gstin')}
          />
          <SelectField label="State" error={errors.stateCode?.message} {...register('stateCode')}>
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </SelectField>
        </FieldGrid>
      </div>

      {full && (
        <div>
          <SectionTitle>Contact & address</SectionTitle>
          <FieldGrid>
            <TextField
              label="Phone"
              type="tel"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              error={errors.phone?.message}
              {...register('phone')}
            />
            <TextField
              label="Billing email"
              type="email"
              autoComplete="email"
              placeholder="billing@company.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <TextField
              label="Address line 1"
              full
              placeholder="Building, street, area"
              error={errors.addressLine1?.message}
              {...register('addressLine1')}
            />
            <TextField
              label="Address line 2"
              full
              error={errors.addressLine2?.message}
              {...register('addressLine2')}
            />
            <TextField
              label="City"
              placeholder="Pune"
              error={errors.city?.message}
              {...register('city')}
            />
            <TextField
              label="PIN code"
              inputMode="numeric"
              maxLength={6}
              placeholder="411001"
              error={errors.postalCode?.message}
              {...register('postalCode')}
            />
          </FieldGrid>
        </div>
      )}
    </fieldset>
  );
}
