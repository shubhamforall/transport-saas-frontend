import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Detail';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { statusLabel } from '@/components/ui/status-label';
import { Table, Td, Th } from '@/components/ui/Table';
import { cn } from '@/lib/cn';
import { csvRupees, downloadCsv } from '@/lib/csv';
import { formatPaise } from '@/lib/format';
import { useTenantQuery } from '@/features/tenants/use-tenant-api';
import type { InvoicesReport, JobsReport, ReceivablesReport } from '@/types/api';

type Tab = 'receivables' | 'invoices' | 'jobs';

const isoDay = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
/** Default range: start of the Indian financial year (1 April) to today. */
function defaultRange() {
  const today = isoDay(new Date());
  const [y, m] = today.split('-').map(Number) as [number, number];
  const fyStart = m >= 4 ? y : y - 1;
  return { from: `${fyStart}-04-01`, to: today };
}

const monthLabel = (m: string) => {
  const [y, mo] = m.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>('receivables');
  const [range, setRange] = useState(defaultRange);
  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="Reports"
        description="Figures are calculated from your saved jobs, invoices and payments."
      />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="inline-flex rounded-lg border border-line bg-white p-1">
          {(['receivables', 'invoices', 'jobs'] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'rounded-md px-3.5 py-1.5 text-[13px] font-semibold',
                tab === t ? 'bg-brand-soft text-brand-dark' : 'text-slate-600 hover:text-ink',
              )}
            >
              {t === 'receivables' ? 'Receivables' : t === 'invoices' ? 'Invoices & GST' : 'Jobs'}
            </button>
          ))}
        </div>
        {tab !== 'receivables' && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <input
              type="date"
              aria-label="From"
              value={range.from}
              max={range.to}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              className="rounded-lg border border-line px-2 py-1.5 text-[13px] text-ink"
            />
            to
            <input
              type="date"
              aria-label="To"
              value={range.to}
              min={range.from}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              className="rounded-lg border border-line px-2 py-1.5 text-[13px] text-ink"
            />
          </div>
        )}
      </div>
      {tab === 'receivables' && <Receivables />}
      {tab === 'invoices' && <Invoices range={range} />}
      {tab === 'jobs' && <Jobs range={range} />}
    </>
  );
}

function CsvButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" onClick={onClick}>
      <Download className="size-3.5" /> CSV
    </Button>
  );
}

function Receivables() {
  const { data, isPending } = useTenantQuery<ReceivablesReport>(
    ['reports', 'receivables'],
    '/reports/receivables',
  );
  if (isPending || !data) return <Spinner label="Calculating" />;
  const t = data.totals;
  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total outstanding" value={formatPaise(t.totalMinor)} />
        <Stat label="Not yet due" value={formatPaise(t.notDueMinor)} />
        <Stat label="1–30 days overdue" value={formatPaise(t.days1to30Minor)} />
        <Stat label="31–60 days" value={formatPaise(t.days31to60Minor)} />
        <Stat label="61–90 days" value={formatPaise(t.days61to90Minor)} />
        <Stat label="Over 90 days" value={formatPaise(t.days90PlusMinor)} />
      </div>
      <Card className="overflow-hidden">
        <CardHeader
          title="Outstanding by customer"
          description={`As of ${data.asOf}. Ageing is by days past the due date.`}
          aside={
            <CsvButton
              onClick={() =>
                downloadCsv(
                  `receivables-${data.asOf}.csv`,
                  ['Customer', 'Invoices', 'Not due', '1-30', '31-60', '61-90', '90+', 'Total'],
                  data.items.map((r) => [
                    r.customerName,
                    r.invoiceCount,
                    csvRupees(r.notDueMinor),
                    csvRupees(r.days1to30Minor),
                    csvRupees(r.days31to60Minor),
                    csvRupees(r.days61to90Minor),
                    csvRupees(r.days90PlusMinor),
                    csvRupees(r.totalMinor),
                  ]),
                )
              }
            />
          }
        />
        {data.items.length === 0 ? (
          <EmptyState title="Nothing outstanding" description="All issued invoices are paid." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Customer</Th>
                <Th className="text-right">Not due</Th>
                <Th className="text-right max-md:hidden">1–30</Th>
                <Th className="text-right max-md:hidden">31–60</Th>
                <Th className="text-right max-md:hidden">61–90</Th>
                <Th className="text-right max-md:hidden">90+</Th>
                <Th className="text-right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.customerId}>
                  <Td>
                    <b>{r.customerName}</b>
                    <span className="block text-[11px] text-subtle">
                      {r.invoiceCount} invoice{r.invoiceCount === 1 ? '' : 's'}
                    </span>
                  </Td>
                  <Td className="text-right">{formatPaise(r.notDueMinor)}</Td>
                  <Td className="text-right max-md:hidden">{formatPaise(r.days1to30Minor)}</Td>
                  <Td className="text-right max-md:hidden">{formatPaise(r.days31to60Minor)}</Td>
                  <Td className="text-right max-md:hidden">{formatPaise(r.days61to90Minor)}</Td>
                  <Td
                    className={cn(
                      'text-right max-md:hidden',
                      r.days90PlusMinor > 0 && 'text-red-600',
                    )}
                  >
                    {formatPaise(r.days90PlusMinor)}
                  </Td>
                  <Td className="text-right font-bold">{formatPaise(r.totalMinor)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

function Invoices({ range }: { range: { from: string; to: string } }) {
  const { data, isPending } = useTenantQuery<InvoicesReport>(
    ['reports', 'invoices'],
    `/reports/invoices?from=${range.from}&to=${range.to}`,
  );
  if (isPending || !data) return <Spinner label="Calculating" />;
  const t = data.totals;
  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Invoices issued" value={t.invoices} />
        <Stat label="Invoiced (incl. GST)" value={formatPaise(t.totalMinor)} />
        <Stat
          label="GST charged"
          value={formatPaise(t.cgstMinor + t.sgstMinor + t.igstMinor)}
          hint={`CGST ${formatPaise(t.cgstMinor)} · SGST ${formatPaise(t.sgstMinor)} · IGST ${formatPaise(t.igstMinor)}`}
        />
        <Stat label="Collected on these invoices" value={formatPaise(t.paidMinor)} />
      </div>
      <Card className="mb-5 overflow-hidden">
        <CardHeader
          title="By month"
          description="Issued, partly paid and paid invoices by invoice date. Verify GST figures with your accountant before filing."
          aside={
            <CsvButton
              onClick={() =>
                downloadCsv(
                  `invoices-${data.from}-to-${data.to}.csv`,
                  ['Month', 'Invoices', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total', 'Paid'],
                  data.byMonth.map((m) => [
                    m.month,
                    m.invoices,
                    csvRupees(m.taxableMinor),
                    csvRupees(m.cgstMinor),
                    csvRupees(m.sgstMinor),
                    csvRupees(m.igstMinor),
                    csvRupees(m.totalMinor),
                    csvRupees(m.paidMinor),
                  ]),
                )
              }
            />
          }
        />
        {data.byMonth.length === 0 ? (
          <EmptyState title="No invoices in this period" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Month</Th>
                <Th className="text-right">Invoices</Th>
                <Th className="text-right max-md:hidden">Taxable</Th>
                <Th className="text-right max-md:hidden">GST</Th>
                <Th className="text-right">Total</Th>
                <Th className="text-right max-md:hidden">Paid</Th>
              </tr>
            </thead>
            <tbody>
              {data.byMonth.map((m) => (
                <tr key={m.month}>
                  <Td>{monthLabel(m.month)}</Td>
                  <Td className="text-right">{m.invoices}</Td>
                  <Td className="text-right max-md:hidden">{formatPaise(m.taxableMinor)}</Td>
                  <Td className="text-right max-md:hidden">
                    {formatPaise(m.cgstMinor + m.sgstMinor + m.igstMinor)}
                  </Td>
                  <Td className="text-right font-bold">{formatPaise(m.totalMinor)}</Td>
                  <Td className="text-right max-md:hidden">{formatPaise(m.paidMinor)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Card className="overflow-hidden">
        <CardHeader title="Top customers" />
        {data.topCustomers.length === 0 ? (
          <CardBody className="text-[13px] text-muted">No invoices in this period.</CardBody>
        ) : (
          <Table>
            <tbody>
              {data.topCustomers.map((c) => (
                <tr key={c.customerId}>
                  <Td>{c.customerName}</Td>
                  <Td className="text-right">{c.invoices} invoices</Td>
                  <Td className="text-right font-bold">{formatPaise(c.totalMinor)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

function Jobs({ range }: { range: { from: string; to: string } }) {
  const { data, isPending } = useTenantQuery<JobsReport>(
    ['reports', 'jobs'],
    `/reports/jobs?from=${range.from}&to=${range.to}`,
  );
  if (isPending || !data) return <Spinner label="Calculating" />;
  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {data.byStatus.length === 0 && <Stat label="Jobs" value={0} />}
        {data.byStatus.map((s) => (
          <Stat key={s.status} label={statusLabel(s.status)} value={s.count} />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader
            title="Jobs by month"
            description="Excludes cancelled jobs."
            aside={
              <CsvButton
                onClick={() =>
                  downloadCsv(
                    `jobs-${data.from}-to-${data.to}.csv`,
                    ['Month', 'Jobs', 'Freight'],
                    data.byMonth.map((m) => [m.month, m.jobs, csvRupees(m.freightMinor)]),
                  )
                }
              />
            }
          />
          <Table>
            <tbody>
              {data.byMonth.map((m) => (
                <tr key={m.month}>
                  <Td>{monthLabel(m.month)}</Td>
                  <Td className="text-right">{m.jobs} jobs</Td>
                  <Td className="text-right font-bold">{formatPaise(m.freightMinor)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {data.byMonth.length === 0 && (
            <CardBody className="text-[13px] text-muted">No jobs in this period.</CardBody>
          )}
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Top routes" />
          <Table>
            <tbody>
              {data.topRoutes.map((r) => (
                <tr key={`${r.originCity}-${r.destinationCity}`}>
                  <Td>
                    {r.originCity} → {r.destinationCity}
                  </Td>
                  <Td className="text-right">{r.jobs}</Td>
                  <Td className="text-right font-bold">{formatPaise(r.freightMinor)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {data.topRoutes.length === 0 && (
            <CardBody className="text-[13px] text-muted">No jobs in this period.</CardBody>
          )}
        </Card>
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader title="Vehicle usage" />
          <Table>
            <tbody>
              {data.vehicleUsage.map((v) => (
                <tr key={v.vehicleId}>
                  <Td>{v.registration}</Td>
                  <Td className="text-right">{v.jobs} jobs</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {data.vehicleUsage.length === 0 && (
            <CardBody className="text-[13px] text-muted">
              No vehicles assigned to jobs in this period.
            </CardBody>
          )}
        </Card>
      </div>
    </>
  );
}
