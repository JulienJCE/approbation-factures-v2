'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('Auth error:', error);
      router.push('/login');
    } else if (code) {
      console.log('✅ Auth code received, redirecting to dashboard');
      sessionStorage.setItem('authCode', code);
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [searchParams, router]);

  return <div>Processing authentication...</div>;
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CallbackContent />
    </Suspense>
  );
}
