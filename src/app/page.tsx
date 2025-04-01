'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const MainLayout = dynamic(() => import('@/components/layout/MainLayout'), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-screen bg-background flex items-center justify-center">
      <Skeleton className='w-full h-full' />
    </div>
  ),
});

export default function Home() {
  return <MainLayout />;
}
