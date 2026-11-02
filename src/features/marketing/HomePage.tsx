import { Link } from 'react-router';
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  MessageSquareWarning,
  Truck,
} from 'lucide-react';
import { buttonClass } from '@/components/ui/button-class';
import { FEATURES, GENERAL_FAQ } from './content';
import { Container, CtaBand, Faq, PlanCards, SectionHeading } from './shared';
import { usePageTitle } from './page-title';

/** A small, static picture of the app for the hero. All values are made up. */
function ProductPreview() {
  const rows = [
    {
      job: 'JOB-0142',
      route: 'Pune → Nashik',
      status: 'In transit',
      tone: 'bg-amber-50 text-amber-700',
    },
    {
      job: 'JOB-0141',
      route: 'Mumbai → Surat',
      status: 'Delivered',
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      job: 'JOB-0140',
      route: 'Nagpur → Raipur',
      status: 'Booked',
      tone: 'bg-blue-50 text-blue-700',
    },
  ];
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-lg select-none">
      <div className="absolute -inset-6 -z-10 rounded-[32px] bg-gradient-to-br from-brand/15 via-accent/10 to-transparent blur-2xl" />
      <div className="rounded-[18px] border border-line bg-white p-4 shadow-xl shadow-slate-200/70 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-bold">Transport jobs</p>
          <span className="rounded-md bg-brand px-2.5 py-1 text-[11px] font-semibold text-white">
            + New job
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {[
            ['Active trips', '18'],
            ['To invoice', '7'],
            ['Outstanding', '₹4.2L'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-line bg-page px-3 py-2.5">
              <p className="text-[10px] font-semibold text-muted">{label}</p>
              <p className="mt-0.5 text-base font-extrabold">{value}</p>
            </div>
          ))}
        </div>
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
          {rows.map((r) => (
            <li key={r.job} className="flex items-center gap-3 px-3 py-2.5">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                <Truck className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold">{r.job}</p>
                <p className="truncate text-[11px] text-muted">{r.route}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.tone}`}>
                {r.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="absolute -bottom-6 -left-4 hidden w-56 rounded-2xl border border-line bg-white p-3.5 shadow-lg shadow-slate-200/70 sm:block">
        <p className="text-[10px] font-semibold text-muted">INV-2026-0087</p>
        <p className="mt-0.5 text-sm font-extrabold">₹17,700.00</p>
        <div className="mt-1.5 flex justify-between text-[10px] text-muted">
          <span>Freight ₹15,000 · GST 18%</span>
        </div>
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          <CheckCircle2 className="size-3" /> Paid
        </span>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-soft/80 via-white to-white">
      <Container className="grid items-center gap-14 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-brand">
            <span className="size-1.5 rounded-full bg-accent" /> Built for Indian transporters
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-balance sm:text-5xl sm:leading-[1.08]">
            Bookings, trips and GST invoices.{' '}
            <span className="bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent">
              One simple app.
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-pretty text-muted sm:text-lg">
            Vaharo replaces the diary, the WhatsApp groups and the Excel sheets. Book jobs, track
            every trip, send GST invoices and know exactly who owes you money.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/sign-up" className={buttonClass('primary', 'md', 'px-6 py-3 text-sm')}>
              Start free trial <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link to="/features" className={buttonClass('secondary', 'md', 'px-6 py-3 text-sm')}>
              See features
            </Link>
          </div>
          <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-slate-600">
            {['No card needed', 'Set up in minutes', 'Works on phone and computer'].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-600" aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </div>
        <ProductPreview />
      </Container>
    </section>
  );
}

function Problems() {
  const items = [
    {
      icon: MessageSquareWarning,
      title: 'Trip details lost in chats',
      text: 'Bookings come by phone and WhatsApp. Finding the LR number or driver later takes ages.',
    },
    {
      icon: FileWarning,
      title: 'Invoices made late',
      text: 'GST invoices are typed by hand at month end, with mistakes in tax and totals.',
    },
    {
      icon: Calculator,
      title: 'No clear view of dues',
      text: 'Nobody knows which customer owes what until someone sits with the ledger.',
    },
  ];
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="Why Vaharo"
          title="Still running your business from a diary?"
          description="Most transport offices lose time and money in the same three places. Vaharo fixes all three."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {items.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-card border border-line bg-page/60 p-6">
              <div className="grid size-10 place-items-center rounded-xl bg-red-50 text-red-600">
                <Icon className="size-5" aria-hidden />
              </div>
              <h3 className="mt-4 font-bold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function FeatureGrid() {
  return (
    <section className="border-y border-line bg-page py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="Features"
          title="Everything from booking to payment"
          description="Each part works on its own, and together they connect a booking to its invoice and its payment."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, summary }) => (
            <div key={title} className="rounded-card border border-line bg-white p-5">
              <div className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                <Icon className="size-5" aria-hidden />
              </div>
              <h3 className="mt-4 font-bold">{title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{summary}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link
            to="/features"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
          >
            See all features <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </Container>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      title: 'Create your company',
      text: 'Add your business name, GSTIN and state. Invite your staff by email.',
    },
    {
      title: 'Book and run jobs',
      text: 'Enter a booking, assign a truck and driver, and move it from booked to delivered.',
    },
    {
      title: 'Invoice and get paid',
      text: 'Bill delivered jobs with GST, email the PDF and record payments as they come in.',
    },
  ];
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <SectionHeading eyebrow="How it works" title="Up and running the same day" />
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="relative rounded-card border border-line bg-white p-6">
              <span className="grid size-9 place-items-center rounded-full bg-navy text-sm font-extrabold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 font-bold">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

function ForYourTeam() {
  const roles = [
    {
      who: 'Owners',
      text: 'See trips, billing and outstanding money for every company from one login.',
    },
    {
      who: 'Operations',
      text: 'Book jobs, assign vehicles and update trip status from the office or the road.',
    },
    {
      who: 'Accounts',
      text: 'Raise GST invoices, record payments and follow up on overdue customers.',
    },
  ];
  return (
    <section className="bg-navy py-16 text-white sm:py-20">
      <Container className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-center">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-accent uppercase">For your team</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
            Everyone sees what they need. Nothing more.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-white/70">
            Give each person a role. Operations staff can't change invoices, and viewers can't edit
            anything.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {roles.map((r) => (
            <div key={r.who} className="rounded-card border border-white/10 bg-white/5 p-5">
              <ClipboardList className="size-5 text-accent" aria-hidden />
              <h3 className="mt-3 font-bold">{r.who}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{r.text}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function HomePage() {
  usePageTitle('');
  return (
    <>
      <Hero />
      <Problems />
      <FeatureGrid />
      <HowItWorks />
      <ForYourTeam />
      <section className="py-16 sm:py-20">
        <Container>
          <SectionHeading
            eyebrow="Pricing"
            title="Simple plans that grow with your fleet"
            description="Start free. Pick a plan when you're ready."
          />
          <div className="mt-10">
            <PlanCards />
          </div>
        </Container>
      </section>
      <section className="border-t border-line bg-page py-16 sm:py-20">
        <Container>
          <SectionHeading eyebrow="FAQ" title="Common questions" />
          <div className="mt-10">
            <Faq items={GENERAL_FAQ} />
          </div>
        </Container>
      </section>
      <CtaBand />
    </>
  );
}
