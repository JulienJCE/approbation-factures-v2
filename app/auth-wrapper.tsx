'use client';

import { useEffect, ReactNode } from 'react';
import { useMsal } from '@azure/msal-react';
import { useRouter } from 'next/navigation';

export function AuthWrapper({ children }: { children: ReactNode }) {
  const { accounts } = useMsal();
  const router = useRouter();

  useEffect(() => {
    if (accounts && accounts.length > 0) {
      router.push('/dashboard');
    }
  }, [accounts, router]);

  return <>{children}</>;
}
