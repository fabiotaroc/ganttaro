import { ChartPage } from '@/components/chart/chart-page';
export default async function Page({ params }: { params: Promise<{ viewKey: string }> }) {
  const { viewKey } = await params;
  return <ChartPage chartKey={viewKey} readOnly />;
}
