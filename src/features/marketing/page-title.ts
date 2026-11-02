import { useEffect } from 'react';
import { BRAND_NAME } from '@/components/layout/Brand';

/** Sets the browser tab title for a public page. An empty title gives the home page title. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title
      ? `${title} · ${BRAND_NAME}`
      : `${BRAND_NAME} · Transport management software`;
  }, [title]);
}
