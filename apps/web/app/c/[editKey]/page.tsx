import { ChartPage } from '@/components/chart/chart-page';
export default async function Page({ params }: { params: Promise<{ editKey: string }> }) {
  const { editKey } = await params;
  return <ChartPage chartKey={editKey} readOnly={false} />;
}
