import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router';
import { z } from 'zod';
import { CalendarCheck, CheckCircle2, Clock, LifeBuoy, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Feedback';
import { api } from '@/lib/api';
import { applyServerErrors } from '@/lib/form-errors';
import { Container, PageHero } from './shared';
import { usePageTitle } from './page-title';

const TOPICS = [
  { value: 'demo', label: 'Book a demo' },
  { value: 'pricing', label: 'Plans and pricing' },
  { value: 'support', label: 'Help with my account' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'other', label: 'Something else' },
] as const;

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(120, 'Keep it under 120 characters'),
  email: z.string().trim().max(254, 'Email is too long').pipe(z.email('Enter a valid email')),
  phone: z
    .string()
    .trim()
    .max(20, 'Phone number is too long')
    .regex(/^[0-9+()\- ]*$/, 'Use digits, spaces, + or -'),
  company: z.string().trim().max(160, 'Keep it under 160 characters'),
  topic: z.enum(['demo', 'pricing', 'support', 'partnership', 'other'], 'Choose a topic'),
  message: z
    .string()
    .trim()
    .min(10, 'Tell us a little more (at least 10 characters)')
    .max(4000, 'Keep the message under 4000 characters'),
  website: z.string(),
});
type ContactValues = z.infer<typeof contactSchema>;
const FIELDS = ['name', 'email', 'phone', 'company', 'topic', 'message'] as const;

function ContactForm() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
      topic: 'demo',
      message: '',
      website: '',
    },
  });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await api('/contact', {
        method: 'POST',
        body: {
          name: v.name,
          email: v.email,
          topic: v.topic,
          message: v.message,
          ...(v.phone && { phone: v.phone }),
          ...(v.company && { company: v.company }),
          ...(v.website && { website: v.website }),
        },
      });
      reset();
      setSent(true);
    } catch (err) {
      setFormError(applyServerErrors(err, setError, FIELDS));
    }
  });

  if (sent) {
    return (
      <div className="flex flex-col items-center rounded-card border border-line bg-white px-6 py-14 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-6" aria-hidden />
        </div>
        <h2 className="mt-4 text-lg font-bold" role="status">
          Thanks, we got your message
        </h2>
        <p className="mt-1.5 max-w-sm text-sm text-muted">
          We'll reply to your email within one working day.
        </p>
        <Button className="mt-6" onClick={() => setSent(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-card border border-line bg-white p-6 sm:p-8"
      aria-label="Contact form"
    >
      <div className="flex flex-col gap-4">
        {formError && <Notice tone="error">{formError}</Notice>}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Your name"
            autoComplete="name"
            required
            placeholder="e.g. Ravi Sharma"
            error={errors.name?.message}
            {...register('name')}
          />
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <TextField
            label="Phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="+91 98765 43210"
            error={errors.phone?.message}
            {...register('phone')}
          />
          <TextField
            label="Company"
            autoComplete="organization"
            placeholder="e.g. Deccan Roadways Co."
            error={errors.company?.message}
            {...register('company')}
          />
        </div>
        <SelectField
          label="What can we help with?"
          required
          error={errors.topic?.message}
          {...register('topic')}
        >
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </SelectField>
        <TextAreaField
          label="Message"
          required
          rows={5}
          placeholder="Tell us about your business: number of vehicles, what you use today, and what you'd like to improve."
          error={errors.message?.message}
          {...register('message')}
        />
        {/* Hidden from people; simple bots fill it in and their message is dropped. */}
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Website
            <input type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
          </label>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-subtle">
            We only use your details to reply. See our{' '}
            <Link to="/privacy" className="font-semibold text-brand hover:underline">
              privacy policy
            </Link>
            .
          </p>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Send message
          </Button>
        </div>
      </div>
    </form>
  );
}

export function ContactPage() {
  usePageTitle('Contact');
  const reasons = [
    {
      icon: CalendarCheck,
      title: 'Book a demo',
      text: 'We will walk you through Vaharo with your own kind of trips and invoices.',
    },
    {
      icon: MessageCircle,
      title: 'Questions about plans',
      text: 'Not sure which plan fits your fleet? Tell us your size and we will suggest one.',
    },
    {
      icon: LifeBuoy,
      title: 'Help with your account',
      text: 'Already using Vaharo? Tell us what is wrong and which company it is about.',
    },
  ];
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Talk to the Vaharo team"
        description="Questions, a demo, or help with your account. Send a message and a real person will reply."
      />
      <section className="py-16 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.5fr]">
          <div className="flex flex-col gap-5">
            {reasons.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                  <Icon className="size-5" aria-hidden />
                </div>
                <div>
                  <h2 className="font-bold">{title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
                </div>
              </div>
            ))}
            <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-line bg-page px-4 py-3 text-[13px] text-slate-600">
              <Clock className="size-4 shrink-0 text-brand" aria-hidden />
              We reply within one working day, Monday to Saturday.
            </div>
          </div>
          <ContactForm />
        </Container>
      </section>
    </>
  );
}
