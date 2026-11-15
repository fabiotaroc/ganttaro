import { Suspense } from 'react';
import { ChartPage } from '@/components/chart/chart-page';
import { Loading } from '@/components/wordmark';

export default function Page({ params }: PageProps<'/v/[viewKey]'>) {
  return (
    <Suspense fallback={<Loading label="Opening Chart…" />}>
      <ViewChart params={params} />
    </Suspense>
  );
}

async function ViewChart({ params }: { params: PageProps<'/v/[viewKey]'>['params'] }) {
  const { viewKey } = await params;
  return <ChartPage chartKey={viewKey} readOnly />;
}
