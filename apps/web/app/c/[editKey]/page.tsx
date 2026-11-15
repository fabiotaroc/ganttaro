import { Suspense } from 'react';
import { ChartPage } from '@/components/chart/chart-page';
import { Loading } from '@/components/wordmark';

export default function Page({ params }: PageProps<'/c/[editKey]'>) {
  return (
    <Suspense fallback={<Loading label="Opening Chart…" />}>
      <EditChart params={params} />
    </Suspense>
  );
}

async function EditChart({ params }: { params: PageProps<'/c/[editKey]'>['params'] }) {
  const { editKey } = await params;
  return <ChartPage chartKey={editKey} readOnly={false} />;
}
