import { Check, HeartHandshake, IndianRupee, Lock, Smartphone, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { FEATURES, GENERAL_FAQ } from './content';
import {
  Container,
  CtaBand,
  Faq,
  PageHero,
  PlanCards,
  SectionHeading,
  type FaqItem,
} from './shared';
import { usePageTitle } from './page-title';

export function FeaturesPage() {
  usePageTitle('Features');
  return (
    <>
      <PageHero
        eyebrow="Features"
        title="Built around how a transport office works"
        description="From the first phone call to the final payment, every step lives in one place and links to the next."
      />
      <section className="py-16 sm:py-20">
        <Container className="flex flex-col gap-6">
          {FEATURES.map(({ icon: Icon, title, summary, points }, i) => (
            <article
              key={title}
              className="grid gap-6 rounded-card border border-line bg-white p-6 sm:p-8 md:grid-cols-[1fr_1.2fr] md:items-start"
            >
              <div>
                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <span className="text-xs font-bold text-subtle">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-extrabold tracking-tight">{title}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{summary}</p>
              </div>
              <ul className="flex flex-col gap-3 rounded-xl bg-page p-5">
                {points.map((p) => (
                  <li key={p} className="flex gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </Container>
      </section>
      <CtaBand title="See it with your own trips" />
    </>
  );
}

const PRICING_FAQ: FaqItem[] = [
  {
    q: 'What happens when my free trial ends?',
    a: 'Your data stays. Pick a plan on the Billing page to keep adding jobs and invoices. Until then the company is read-only, and nothing is deleted.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes. Move to a bigger plan when your fleet or team grows. Contact us if you need to move to a smaller one.',
  },
  {
    q: 'How do I pay?',
    a: 'Online through Razorpay with UPI, cards or net banking, where online payment is switched on. Otherwise contact us and we will set it up for you.',
  },
  {
    q: 'Do prices include GST?',
    a: 'Prices are shown before GST. GST is added where it applies.',
  },
  {
    q: 'I have more than one company. Do I pay twice?',
    a: 'Each company has its own plan, because each has its own data, team and invoices. You manage all of them from one login.',
  },
];

export function PricingPage() {
  usePageTitle('Pricing');
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Pay for the size of your business, nothing else"
        description="Every plan has all features. Plans differ only by how many team members and vehicles you can add. Start with a free trial, no card needed."
      />
      <section className="py-16 sm:py-20">
        <Container>
          <PlanCards />
          <p className="mt-6 text-center text-xs text-subtle">
            Need more users or vehicles?{' '}
            <Link to="/contact" className="font-semibold text-brand hover:underline">
              Talk to us
            </Link>{' '}
            about a custom plan.
          </p>
        </Container>
      </section>
      <section className="border-t border-line bg-page py-16 sm:py-20">
        <Container>
          <SectionHeading eyebrow="FAQ" title="Questions about plans" />
          <div className="mt-10">
            <Faq items={PRICING_FAQ} />
          </div>
        </Container>
      </section>
      <CtaBand />
    </>
  );
}

export function AboutPage() {
  usePageTitle('About us');
  const values = [
    {
      icon: Sparkles,
      title: 'Simple first',
      text: 'If a screen needs training, we redo it. Your staff should be booking jobs on day one.',
    },
    {
      icon: IndianRupee,
      title: 'Made for India',
      text: 'GST, LR numbers, UPI and rupee amounts are built in, not added on.',
    },
    {
      icon: Lock,
      title: 'Your data is yours',
      text: 'Each company is kept separate, and only people you invite can see it.',
    },
    {
      icon: Smartphone,
      title: 'Works where you work',
      text: 'In the office on a computer, or on the road from a phone browser.',
    },
  ];
  return (
    <>
      <PageHero
        eyebrow="About us"
        title="Software for the people who keep India's goods moving"
        description="Vaharo helps small and mid-sized transport businesses run their day without paper diaries, scattered chats and month-end invoice rush."
      />
      <section className="py-16 sm:py-20">
        <Container className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHeading center={false} eyebrow="Our story" title="Why we built Vaharo" />
            <div className="mt-5 flex flex-col gap-4 text-[15px] leading-relaxed text-muted">
              <p>
                Thousands of transport businesses across India still run on phone calls, WhatsApp
                messages and handwritten registers. Bookings get lost, invoices go out late and
                nobody is sure how much money is still due.
              </p>
              <p>
                Big logistics companies have expensive software for this. Fleet owners with five
                trucks or fifty usually don't. Vaharo is our answer: a simple, affordable tool that
                covers the whole job from booking to payment.
              </p>
            </div>
          </div>
          <div className="rounded-[22px] border border-line bg-page p-8">
            <HeartHandshake className="size-8 text-brand" aria-hidden />
            <p className="mt-4 text-xs font-bold tracking-[0.14em] text-brand uppercase">
              Our goal
            </p>
            <p className="mt-2 text-xl leading-snug font-bold text-balance">
              A transport owner should know where every truck, invoice and rupee stands, in under a
              minute.
            </p>
          </div>
        </Container>
      </section>
      <section className="border-y border-line bg-page py-16 sm:py-20">
        <Container>
          <SectionHeading eyebrow="What we believe" title="How we build" />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-card border border-line bg-white p-6">
                <div className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                  <Icon className="size-5" aria-hidden />
                </div>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
      <section className="py-16 sm:py-20">
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
