'use client';

import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { ReactNode, useEffect, useState } from 'react';

const msalConfig = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID}`,
    redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    postLogoutRedirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

let pca: PublicClientApplication | null = null;

if (typeof window !== 'undefined') {
  pca = new PublicClientApplication(msalConfig);
}

export function Providers({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (pca) {
      pca.handleRedirectPromise()
        .then(() => {
          console.log('✅ MSAL redirect handled');
          setIsReady(true);
        })
        .catch(err => {
          console.error('MSAL error:', err);
          setIsReady(true);
        });
    }
  }, []);

  if (!pca || !isReady) {
    return <>{children}</>;
  }

  return <MsalProvider instance={pca}>{children}</MsalProvider>;
}
