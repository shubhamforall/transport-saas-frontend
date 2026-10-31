import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/Card';
import { BackLink } from '@/components/ui/Detail';
import {
  FieldGrid,
  SectionTitle,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/ui/Field';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/toast-context';
import { applyServerErrors } from '@/lib/form-errors';
import { useUnsavedChangesWarning } from '@/lib/hooks';
import { INDIAN_STATES } from '@/lib/indian-states';
import { useCurrentTenant } from '@/features/tenants/tenant-context';
import { useTenantMutation, useTenantQuery } from '@/features/tenants/use-tenant-api';
import type { Customer } from '@/types/api';
import {
  CUSTOMER_FIELDS,
  customerSchema,
  toCustomerForm,
  toCustomerInput,
  type CustomerFormValues,
} from './schemas';

export function CustomerFormPage() {
  const { customerId } = useParams();
  const editing = Boolean(customerId);
  const { data, isPending } = useTenantQuery<Customer>(
    ['customers', customerId],
    `/customers/${customerId}`,
    { enabled: editing },
  );
  if (editing && isPending) return <Spinner label="Loading customer" />;
  return <CustomerForm customer={editing ? data : undefined} />;
}

function CustomerForm({ customer }: { customer?: Customer }) {
  const { tenant } = useCurrentTenant();
  const navigate = useNavigate();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const save = useTenantMutation<ReturnType<typeof toCustomerInput>, Customer>(
    customer ? 'PATCH' : 'POST',
    customer ? `/customers/${customer.id}` : '/customers',
    ['customers'],
  );

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: toCustomerForm(customer),
  });
  useUnsavedChangesWarning(isDirty && !isSubmitting);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const saved = await save.mutateAsync(toCustomerInput(values));
      reset(values);
      toast.success(customer ? 'Customer updated.' : 'Customer saved.');
      navigate(`/t/${tenant.id}/customers/${saved.id}`);
    } catch (err) {
      setFormError(applyServerErrors(err, setError, CUSTOMER_FIELDS));
    }
  });

  const back = customer ? `/t/${tenant.id}/customers/${customer.id}` : `/t/${tenant.id}/customers`;

  return (
    <>
      <BackLink to={back} label={customer ? 'Back to customer' : 'All customers'} />
      <PageHeader
        eyebrow="Customer directory"
        title={customer ? `Edit ${customer.name}` : 'Create customer'}
        description="Add a billing contact once, then select them when creating transport jobs and invoices."
      />
      {!customer && (
        <div className="mb-5 max-w-225">
          <Notice>
            <b>Quick tip:</b> Add the customer's billing email and GST details accurately to help
            invoices reach the right person.
          </Notice>
        </div>
      )}
      <form onSubmit={onSubmit} noValidate className="max-w-225">
        <Card>
          <CardHeader title="Customer information" description="Fields marked * are required." />
          <CardBody className="flex flex-col gap-6">
            {formError && <Notice tone="error">{formError}</Notice>}
            <div>
              <SectionTitle>Basic details</SectionTitle>
              <FieldGrid>
                <SelectField label="Customer type" required {...register('customerType')}>
                  <option value="BUSINESS">Business</option>
                  <option value="INDIVIDUAL">Individual</option>
                </SelectField>
                <TextField
                  label="Customer / business name"
                  required
                  placeholder="e.g. ABC Manufacturing Pvt. Ltd."
                  error={errors.name?.message}
                  {...register('name')}
                />
                <TextField
                  label="Contact person"
                  placeholder="Full name"
                  error={errors.contactPerson?.message}
                  {...register('contactPerson')}
                />
                <TextField
                  label="Phone number"
                  type="tel"
                  placeholder="+91 98765 43210"
                  error={errors.phone?.message}
                  {...register('phone')}
                />
                <TextField
                  label="Billing email"
                  type="email"
                  placeholder="accounts@company.com"
                  hint="Invoices will be sent to this email address."
                  error={errors.email?.message}
                  {...register('email')}
                />
                <TextField
                  label="GSTIN"
                  maxLength={15}
                  className="uppercase"
                  placeholder="15-character GSTIN"
                  hint="Leave blank if not applicable. Format is checked, not verified."
                  error={errors.gstin?.message}
                  {...register('gstin')}
                />
              </FieldGrid>
            </div>
            <hr className="border-line" />
            <div>
              <SectionTitle>Billing address</SectionTitle>
              <FieldGrid>
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
                <SelectField
                  label="State"
                  error={errors.stateCode?.message}
                  {...register('stateCode')}
                >
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </SelectField>
                <TextField
                  label="PIN code"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="411001"
                  error={errors.postalCode?.message}
                  {...register('postalCode')}
                />
                <SelectField
                  label="Payment terms"
                  hint="Used for the invoice due date."
                  {...register('paymentTermsDays')}
                >
                  <option value="">Company default ({tenant.defaultPaymentTermsDays} days)</option>
                  <option value="0">Due immediately</option>
                  <option value="7">Net 7 days</option>
                  <option value="15">Net 15 days</option>
                  <option value="30">Net 30 days</option>
                  <option value="45">Net 45 days</option>
                  <option value="60">Net 60 days</option>
                </SelectField>
                <TextAreaField
                  label="Internal notes"
                  full
                  placeholder="Optional notes for your team"
                  error={errors.notes?.message}
                  {...register('notes')}
                />
              </FieldGrid>
            </div>
          </CardBody>
          <CardFooter>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              <Lock className="size-3.5" aria-hidden /> Customer details are scoped to this company.
            </span>
            <div className="flex gap-2">
              <Button onClick={() => navigate(back)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={isSubmitting}>
                {customer ? 'Save changes' : 'Save customer'}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>
    </>
  );
}
