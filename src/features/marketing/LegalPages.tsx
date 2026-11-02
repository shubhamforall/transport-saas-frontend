import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Container, PageHero } from './shared';
import { usePageTitle } from './page-title';

const LAST_UPDATED = '2 November 2026';

function LegalBody({ sections }: { sections: { title: string; body: ReactNode }[] }) {
  return (
    <section className="py-14 sm:py-16">
      <Container className="max-w-3xl">
        <p className="text-xs text-subtle">Last updated {LAST_UPDATED}</p>
        <div className="mt-6 flex flex-col gap-8">
          {sections.map((s, i) => (
            <div key={s.title}>
              <h2 className="text-lg font-bold">
                {i + 1}. {s.title}
              </h2>
              <div className="mt-2 flex flex-col gap-3 text-[15px] leading-relaxed text-slate-600">
                {s.body}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

const contactLink = (
  <Link to="/contact" className="font-semibold text-brand hover:underline">
    contact page
  </Link>
);

export function PrivacyPage() {
  usePageTitle('Privacy policy');
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Privacy policy"
        description="What we collect, why we collect it and what we do with it."
      />
      <LegalBody
        sections={[
          {
            title: 'What we collect',
            body: (
              <>
                <p>
                  <strong>Account details:</strong> your name, email address and a hashed copy of
                  your password (we never store the password itself).
                </p>
                <p>
                  <strong>Business data you enter:</strong> company details such as GSTIN and
                  address, customers, vehicles, transport jobs, invoices and payments.
                </p>
                <p>
                  <strong>Technical data:</strong> IP address and basic request logs, used to keep
                  the service secure and fix problems.
                </p>
              </>
            ),
          },
          {
            title: 'How we use it',
            body: (
              <p>
                To run the service for you: sign you in, show your company's data to the people you
                invite, send emails you ask for (such as invoices and invitations), send account
                emails (such as verification codes and password resets) and handle your
                subscription. We do not sell your data and we do not use it for advertising.
              </p>
            ),
          },
          {
            title: 'Who can see your business data',
            body: (
              <p>
                Only members of your company, with the access their role allows. A small number of
                Vaharo staff can access accounts when needed to provide support, investigate abuse
                or meet a legal obligation.
              </p>
            ),
          },
          {
            title: 'Service providers',
            body: (
              <p>
                We use trusted providers to host the service, send email and take online payments
                (Razorpay). They process data only to provide their service to us. Card and UPI
                details are handled by the payment provider and never reach our servers.
              </p>
            ),
          },
          {
            title: 'Cookies',
            body: (
              <p>
                We use only the cookies needed to keep you signed in and protect forms against
                misuse. We do not use advertising or tracking cookies.
              </p>
            ),
          },
          {
            title: 'How long we keep data',
            body: (
              <p>
                We keep your data while your account is active. Invoices and payment records may
                need to be kept for the period required by Indian tax law. You can ask us to delete
                your account and data at any time, subject to those legal requirements.
              </p>
            ),
          },
          {
            title: 'Your choices',
            body: (
              <p>
                You can update your name and password from My profile. To get a copy of your data or
                to delete your account, write to us through the {contactLink}.
              </p>
            ),
          },
          {
            title: 'Changes and contact',
            body: (
              <p>
                If we change this policy we will update the date above and, for important changes,
                tell you by email. Questions? Use the {contactLink}.
              </p>
            ),
          },
        ]}
      />
    </>
  );
}

export function TermsPage() {
  usePageTitle('Terms of service');
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Terms of service"
        description="The rules for using Vaharo. Please read them before you sign up."
      />
      <LegalBody
        sections={[
          {
            title: 'Using Vaharo',
            body: (
              <p>
                By creating an account you agree to these terms. You must give correct details and
                keep your password safe. You are responsible for what happens in your account and
                for the people you invite to your company.
              </p>
            ),
          },
          {
            title: 'Your data',
            body: (
              <p>
                Business data you enter belongs to you. You give us permission to store and process
                it only to provide the service. You are responsible for the accuracy of invoices,
                tax amounts and other figures you create.
              </p>
            ),
          },
          {
            title: 'GST and tax',
            body: (
              <p>
                Vaharo helps you prepare GST invoices and reports but does not give tax or legal
                advice and does not file returns. Check figures with your accountant before you
                file.
              </p>
            ),
          },
          {
            title: 'Free trial, plans and payment',
            body: (
              <p>
                New companies get a free trial. After it ends, a paid plan is needed to keep adding
                and editing data; until then the company is read-only and nothing is deleted. Plan
                prices are shown on the pricing page, exclude GST, and may change with notice.
                Payments already made are not refunded unless the law requires it.
              </p>
            ),
          },
          {
            title: 'Fair use',
            body: (
              <p>
                Don't misuse the service: no illegal content, no attempts to break into other
                accounts or overload the system, and no reselling without our written permission. We
                may suspend accounts that break these rules.
              </p>
            ),
          },
          {
            title: 'Availability and liability',
            body: (
              <p>
                We work to keep Vaharo running and your data backed up, but we can't promise the
                service will never be interrupted. To the extent the law allows, our total liability
                is limited to the amount you paid us in the last three months.
              </p>
            ),
          },
          {
            title: 'Ending your account',
            body: (
              <p>
                You can cancel your subscription at any time from the Billing page. Cancelling keeps
                access until the end of the paid period. To close your account completely, use the{' '}
                {contactLink}.
              </p>
            ),
          },
          {
            title: 'Law',
            body: (
              <p>
                These terms are governed by the laws of India. If we change them we will update the
                date above and tell you about important changes.
              </p>
            ),
          },
        ]}
      />
    </>
  );
}
