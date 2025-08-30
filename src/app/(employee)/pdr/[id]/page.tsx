'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabasePDR } from '@/hooks/use-supabase-pdrs';

interface PDRPageProps {
  params: { id: string };
}

export default function PDRPage({ params }: PDRPageProps) {
  const router = useRouter();
  const { data: pdr, isLoading } = useSupabasePDR(params.id);

  useEffect(() => {
    if (!isLoading && pdr) {
      // Redirect to the appropriate step based on PDR status
      const stepPaths = {
        1: `/pdr/${pdr.id}/goals`,
        2: `/pdr/${pdr.id}/behaviors`, 
        3: `/pdr/${pdr.id}/review`,
        4: `/pdr/${pdr.id}/mid-year`,
        5: `/pdr/${pdr.id}/end-year`,
      };

      const currentPath = stepPaths[pdr.currentStep as keyof typeof stepPaths];
      if (currentPath) {
        router.replace(currentPath);
      }
    }
  }, [pdr, isLoading, router]);

  // Show loading while redirecting
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
