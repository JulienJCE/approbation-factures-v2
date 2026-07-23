'use client';

import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { ReactNode } from 'react';

const msalConfig = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID}`,
    redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    postLogoutRedirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: true,
  },
};

let pca: PublicClientApplication | null = null;

if (typeof window !== 'undefined') {
  pca = new PublicClientApplication(msalConfig);
  
  // Gérer le redirect après login
  pca.handleRedirectPromise().catch(err => {
    console.error('MSAL redirect error:', err);
  });
}

export function Providers({ children }: { children: ReactNode }) {
  if (!pca) {
    return <>{children}</>;
  }
  
  return <MsalProvider instance={pca}>{children}</MsalProvider>;
}
