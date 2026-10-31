import { z } from 'zod';

const schema = z.object({
  VITE_API_BASE_URL: z.url().default('http://localhost:4000/api/v1'),
});

const parsed = schema.safeParse(import.meta.env);
if (!parsed.success) {
  throw new Error(
    `Invalid frontend environment: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`,
  );
}

/** Public build-time configuration. Never put secrets in VITE_ variables. */
export const env = {
  apiBaseUrl: parsed.data.VITE_API_BASE_URL.replace(/\/+$/, ''),
};
