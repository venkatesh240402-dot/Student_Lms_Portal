'use client';

import { useEffect, useState } from 'react';

export function MSWProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function enableApiMocking() {
      if (process.env.NEXT_PUBLIC_API_MODE === 'mock') {
        const { initMocks } = await import('../mocks');
        await initMocks();
      }
      setIsReady(true);
    }
    enableApiMocking();
  }, []);

  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}
