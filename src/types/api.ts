/**
 * API types. Keep in step with transport-saas-backend/docs/API.md (the API contract).
 */

export type Role = 'OWNER' | 'ADMIN' | 'OPERATIONS' | 'ACCOUNTS' | 'VIEWER';

export type Permission =
  | 'tenant.read'
  | 'tenant.update'
  | 'members.read'
  | 'members.manage'
  | 'billing.manage'
  | 'customers.read'
  | 'customers.write'
  | 'vehicles.read'
  | 'vehicles.write'
  | 'jobs.read'
  | 'jobs.write'
  | 'invoices.read'
  | 'invoices.write'
  | 'payments.read'
  | 'payments.write'
  | 'reports.read';

export interface User {
  id: string;
  name: string;
  email: string;
  isPlatformAdmin: boolean;
}

export interface MembershipSummary {
  membershipId: string;
  tenantId: string;
  tenantName: string;
  role: Role;
  permissions: Permission[];
}

export interface MeResponse {
  user: User;
  memberships: MembershipSummary[];
}

export interface Tenant {
  id: string;
  name: string;
  legalName: string | null;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  gstin: string | null;
  stateCode: string | null;
  currency: string;
  timezone: string;
  status: 'ACTIVE' | 'SUSPENDED';
  jobNumberPrefix: string;
  invoicePrefix: string;
  defaultPaymentTermsDays: number;
  defaultTaxRateBps: number;
  defaultSacCode: string | null;
  invoiceTerms: string | null;
  paymentInstructions: string | null;
  createdAt: string;
  updatedAt: string;
  myRole: Role;
  myPermissions: Permission[];
}

export interface HealthResponse {
  status: 'ok';
  service: string;
  time: string;
}

// ---- Lists ----------------------------------------------------------------------------------

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ---- Customers & vehicles (Milestone 2) -----------------------------------------------------

export interface Customer {
  id: string;
  customerType: 'BUSINESS' | 'INDIVIDUAL';
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  stateCode: string | null;
  postalCode: string | null;
  gstin: string | null;
  paymentTermsDays: number | null;
  notes: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  jobCount?: number;
  invoiceCount?: number;
}

export type VehicleType =
  | 'MINI_TRUCK'
  | 'LCV'
  | 'MEDIUM_TRUCK'
  | 'HEAVY_TRUCK'
  | 'TRAILER'
  | 'CONTAINER_TRUCK'
  | 'PICKUP'
  | 'OTHER';

export interface Vehicle {
  id: string;
  registrationNumberDisplay: string;
  registrationNumberNormalized: string;
  vehicleType: VehicleType;
  makeModel: string | null;
  capacityMilli: number | null;
  capacityUnit: 'TONNES' | 'KG' | 'CUBIC_METRES' | null;
  ownershipType: 'OWNED' | 'LEASED' | 'ATTACHED' | 'OTHER' | null;
  notes: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  jobCount?: number;
}

// ---- Jobs (Milestone 3) ---------------------------------------------------------------------

export type JobStatus = 'DRAFT' | 'BOOKED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';

export interface Job {
  id: string;
  jobNumber: string;
  customerId: string;
  vehicleId: string | null;
  customer: { id: string; name: string; status: string };
  vehicle: { id: string; registrationNumberDisplay: string; vehicleType: VehicleType } | null;
  bookingDate: string;
  originAddress: string | null;
  originCity: string;
  destinationAddress: string | null;
  destinationCity: string;
  plannedPickupDate: string | null;
  actualPickupDate: string | null;
  plannedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  driverName: string | null;
  driverPhone: string | null;
  goodsDescription: string;
  quantityMilli: number | null;
  quantityUnit: string | null;
  lrNumber: string | null;
  freightAmountMinor: number;
  discountAmountMinor: number;
  taxRateBps: number | null;
  status: JobStatus;
  internalNotes: string | null;
  charges: { id: string; description: string; amountMinor: number }[];
  chargesTotalMinor: number;
  totalMinor: number;
  invoice: { id: string; invoiceNumber: string | null; status: string } | null;
  invoiceState: 'NOT_INVOICED' | 'IN_DRAFT' | 'INVOICED';
  allowedTransitions: JobStatus[];
  createdAt: string;
  statusHistory?: {
    id: string;
    fromStatus: JobStatus | null;
    toStatus: JobStatus;
    note: string | null;
    createdAt: string;
  }[];
}

// ---- Invoices & payments (Milestones 4-5) ---------------------------------------------------

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
export type TaxType = 'NONE' | 'INTRA_STATE' | 'INTER_STATE';

export interface Party {
  name: string;
  legalName?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  stateCode?: string | null;
  postalCode?: string | null;
  gstin?: string | null;
  paymentInstructions?: string | null;
}

export interface InvoiceItem {
  id?: string;
  description: string;
  sacCode: string | null;
  quantityMilli: number;
  unitPriceMinor: number;
  discountMinor: number;
  taxableAmountMinor?: number;
  taxRateBps: number;
  taxAmountMinor?: number;
  lineTotalMinor?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string | null;
  status: InvoiceStatus;
  displayStatus: InvoiceStatus | 'OVERDUE';
  customerId: string;
  customer: { id: string; name: string; email: string | null };
  invoiceDate: string;
  dueDate: string | null;
  taxType: TaxType;
  placeOfSupplyStateCode: string | null;
  billTo: Party;
  from: Party;
  currency: string;
  subtotalMinor: number;
  discountMinor: number;
  taxableMinor: number;
  cgstMinor: number;
  sgstMinor: number;
  igstMinor: number;
  taxTotalMinor: number;
  grandTotalMinor: number;
  amountPaidMinor: number;
  balanceMinor: number;
  notes: string | null;
  terms: string | null;
  items: InvoiceItem[];
  jobs: {
    id: string;
    jobNumber: string;
    originCity: string;
    destinationCity: string;
    goodsDescription: string;
    lrNumber: string | null;
    vehicleRegistration: string | null;
    actualDeliveryDate: string | null;
  }[];
  payments: {
    paymentId: string;
    paymentDate: string;
    method: PaymentMethod;
    reference: string | null;
    allocatedAmountMinor: number;
  }[];
  issuedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  lastEmailedAt: string | null;
  createdAt: string;
}

export interface InvoiceListItem {
  id: string;
  invoiceNumber: string | null;
  status: InvoiceStatus;
  displayStatus: InvoiceStatus | 'OVERDUE';
  customer: { id: string; name: string };
  invoiceDate: string;
  dueDate: string | null;
  grandTotalMinor: number;
  amountPaidMinor: number;
  balanceMinor: number;
  lastEmailedAt: string | null;
}

export interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  status: 'SENDING' | 'SENT' | 'FAILED';
  attemptCount: number;
  lastErrorSafe: string | null;
  sentAt: string | null;
  createdAt: string;
}

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'OTHER';

export interface Payment {
  id: string;
  customer: { id: string; name: string };
  paymentDate: string;
  amountMinor: number;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  status: 'RECORDED' | 'VOIDED';
  voidReason: string | null;
  allocations: { invoiceId: string; invoiceNumber: string | null; allocatedAmountMinor: number }[];
  createdAt: string;
}

// ---- Dashboard & reports --------------------------------------------------------------------

export interface Dashboard {
  month: string;
  jobs: { active: number; inTransit: number; deliveredAwaitingInvoice: number };
  invoicesThisMonth: { count: number; totalMinor: number };
  outstanding: { count: number; amountMinor: number };
  overdue: { count: number; amountMinor: number };
  receivedThisMonthMinor: number;
  counts: { activeCustomers: number; activeVehicles: number };
  recentJobs: {
    id: string;
    jobNumber: string;
    status: JobStatus;
    originCity: string;
    destinationCity: string;
    bookingDate: string;
    customer: { name: string };
  }[];
  recentInvoices: {
    id: string;
    invoiceNumber: string | null;
    status: InvoiceStatus;
    displayStatus: string;
    invoiceDate: string;
    grandTotalMinor: number;
    balanceMinor: number;
    customer: { name: string };
  }[];
}

export interface ReceivablesReport {
  asOf: string;
  items: {
    customerId: string;
    customerName: string;
    invoiceCount: number;
    notDueMinor: number;
    days1to30Minor: number;
    days31to60Minor: number;
    days61to90Minor: number;
    days90PlusMinor: number;
    totalMinor: number;
  }[];
  totals: Record<
    | 'notDueMinor'
    | 'days1to30Minor'
    | 'days31to60Minor'
    | 'days61to90Minor'
    | 'days90PlusMinor'
    | 'totalMinor',
    number
  >;
}

export interface JobsReport {
  from: string;
  to: string;
  byStatus: { status: JobStatus; count: number }[];
  byMonth: { month: string; jobs: number; freightMinor: number }[];
  topRoutes: { originCity: string; destinationCity: string; jobs: number; freightMinor: number }[];
  vehicleUsage: { vehicleId: string; registration: string; jobs: number }[];
}

export interface InvoicesReport {
  from: string;
  to: string;
  byMonth: {
    month: string;
    invoices: number;
    taxableMinor: number;
    cgstMinor: number;
    sgstMinor: number;
    igstMinor: number;
    totalMinor: number;
    paidMinor: number;
  }[];
  totals: {
    invoices: number;
    taxableMinor: number;
    cgstMinor: number;
    sgstMinor: number;
    igstMinor: number;
    totalMinor: number;
    paidMinor: number;
  };
  topCustomers: {
    customerId: string;
    customerName: string;
    invoices: number;
    totalMinor: number;
    paidMinor: number;
  }[];
}

// ---- Team (Milestone 6) ---------------------------------------------------------------------

export interface Member {
  id: string;
  role: Role;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
  createdAt: string;
  expired: boolean;
}

// ---- Subscriptions & platform (Milestone 7) -------------------------------------------------

export type SubscriptionStatus =
  'TRIAL' | 'PENDING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';

export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceMinor: number;
  currency: string;
  billingInterval: 'MONTHLY' | 'YEARLY';
  limits: { maxUsers?: number; maxVehicles?: number };
  features: string[];
  isActive: boolean;
  sortOrder: number;
  onlineCheckout: boolean;
}

export interface SubscriptionSummary {
  subscription: {
    id: string;
    status: SubscriptionStatus;
    provider: 'NONE' | 'RAZORPAY' | 'MANUAL';
    plan: Plan;
    trialEndsAt: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  pendingCheckout: { planCode: string; createdAt: string } | null;
  access: { mode: 'FULL' | 'READ_ONLY'; reason: string | null; fullAccessUntil: string | null };
  usage: { vehicles: number; users: number };
  limits: { maxUsers?: number; maxVehicles?: number };
  onlinePaymentsAvailable: boolean;
}

export interface CheckoutResponse {
  provider: 'razorpay';
  keyId: string;
  subscriptionId: string;
  plan: Plan;
  prefill: { name: string; email: string };
  companyName: string;
}
