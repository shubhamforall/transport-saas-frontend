import type { CheckoutResponse } from '@/types/api';

interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: (resp: unknown) => void) => void;
}
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayCtor;
  }
}

const SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';
let loading: Promise<RazorpayCtor> | null = null;

function loadScript(): Promise<RazorpayCtor> {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT;
    s.async = true;
    s.onload = () =>
      window.Razorpay ? resolve(window.Razorpay) : reject(new Error('Razorpay failed to load'));
    s.onerror = () => {
      loading = null;
      reject(new Error('Could not load Razorpay checkout'));
    };
    document.body.appendChild(s);
  });
  return loading;
}

/**
 * Opens Razorpay's hosted checkout for a subscription. The browser result is only a hint:
 * access changes when Vaharo receives Razorpay's signed webhook.
 */
export async function openRazorpayCheckout(c: CheckoutResponse, onDone: (paid: boolean) => void) {
  const Razorpay = await loadScript();
  const rzp = new Razorpay({
    key: c.keyId,
    subscription_id: c.subscriptionId,
    name: 'Vaharo',
    description: `${c.plan.name} plan for ${c.companyName}`,
    prefill: c.prefill,
    theme: { color: '#2563eb' },
    handler: () => onDone(true),
    modal: { ondismiss: () => onDone(false) },
  });
  rzp.on('payment.failed', () => onDone(false));
  rzp.open();
}
