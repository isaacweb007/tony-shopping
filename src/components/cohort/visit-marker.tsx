'use client';

import * as React from 'react';
import { useVisitedCohortsStore } from '@/stores/visited-cohorts-store';

interface Props {
  slug: string;
}

/**
 * Client-only mount-effect — stamps the current slug into the
 * visited-cohorts store. Rendered server-side as nothing, so the
 * /c/{slug} server tree stays clean. Mounted from the cohort page.
 */
export function CohortVisitMarker({ slug }: Props) {
  const mark = useVisitedCohortsStore((s) => s.mark);
  React.useEffect(() => {
    mark(slug);
  }, [mark, slug]);
  return null;
}
