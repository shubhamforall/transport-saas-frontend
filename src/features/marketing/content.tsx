import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Building2,
  FileText,
  IndianRupee,
  Route,
  ShieldCheck,
  Truck,
  Users,
} from 'lucide-react';
import { Link } from 'react-router';
import type { FaqItem } from './shared';

export interface Feature {
  icon: LucideIcon;
  title: string;
  summary: string;
  points: string[];
}

/** What the product does today. Keep this in step with the app; don't list planned features. */
export const FEATURES: Feature[] = [
  {
    icon: Route,
    title: 'Transport jobs',
    summary: 'Book every trip with pickup, delivery, goods, LR number and charges.',
    points: [
      'Draft, booked, in transit, delivered or cancelled at a glance',
      'Assign a vehicle and driver to each job',
      'Freight, extra charges and discounts worked out for you',
      'Full status history on every job',
    ],
  },
  {
    icon: FileText,
    title: 'GST invoices',
    summary: 'Turn delivered jobs into GST invoices in a few clicks.',
    points: [
      'CGST + SGST or IGST picked from the place of supply',
      'Your own invoice numbering, SAC code, terms and bank / UPI details',
      'Download a clean PDF or email it straight to the customer',
      'Draft, issued, partly paid, paid and cancelled states',
    ],
  },
  {
    icon: IndianRupee,
    title: 'Payments',
    summary: 'Record money received and see what each customer still owes.',
    points: [
      'Cash, bank transfer, UPI or cheque',
      'Split one payment across several invoices',
      'Invoices update to partly paid or paid on their own',
    ],
  },
  {
    icon: Users,
    title: 'Customers',
    summary: 'One record per customer with GSTIN, address and payment terms.',
    points: [
      'All jobs, invoices and payments for a customer in one place',
      'Payment terms set due dates on invoices automatically',
      'Search and filter customers in seconds',
    ],
  },
  {
    icon: Truck,
    title: 'Vehicles',
    summary: 'Keep your fleet list and see how each vehicle is being used.',
    points: [
      'Registration number, vehicle type, capacity and ownership',
      'Mark vehicles active or inactive',
      'Trips per vehicle in your reports',
    ],
  },
  {
    icon: BarChart3,
    title: 'Reports',
    summary: 'Know your outstanding money and busiest routes without Excel.',
    points: [
      'Outstanding by customer, with ageing by days overdue',
      'Monthly billing with GST totals',
      'Jobs by month, top customers, top routes and vehicle usage',
      'Download any report as a CSV file for Excel',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Team and roles',
    summary: 'Invite your staff and decide what each person can see and change.',
    points: [
      'Owner, Admin, Operations, Accounts and Viewer roles',
      'Invite by email; people join with one click',
      'Remove access the moment someone leaves',
    ],
  },
  {
    icon: Building2,
    title: 'More than one company',
    summary: 'Run several firms from one login, each with its own data and billing.',
    points: [
      'Switch company from the sidebar',
      'Data is kept separate for every company',
      'Each company has its own invoice settings and team',
    ],
  },
];

export const GENERAL_FAQ: FaqItem[] = [
  {
    q: 'Who is Vaharo for?',
    a: 'Goods-transport businesses in India: fleet owners, transport contractors and logistics firms that book trips for customers and bill them with GST.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'No. Vaharo runs in the browser on your computer or phone. Sign up, create your company and start adding jobs.',
  },
  {
    q: 'Is the free trial really free?',
    a: (
      <>
        Yes. You don't need a card to start. When the trial ends you can pick a plan from the
        Billing page. See{' '}
        <Link to="/pricing" className="font-semibold text-brand hover:underline">
          pricing
        </Link>
        .
      </>
    ),
  },
  {
    q: 'Is my data safe?',
    a: 'Each company’s data is kept separate and only people you invite can see it. Connections are encrypted, passwords are stored hashed, and you choose what each team member can do.',
  },
  {
    q: 'Does Vaharo file my GST returns?',
    a: 'No. Vaharo prepares GST invoices and monthly totals that make filing easier. Your accountant should still check the figures before you file.',
  },
];
