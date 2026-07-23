import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';

const msalConfig = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID}`,
    redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  },
};

let pca: PublicClientApplication | null = null;

if (typeof window !== 'undefined') {
  pca = new PublicClientApplication(msalConfig);
}

export const metadata = {
  title: 'Approbation Factures v2',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!pca) {
    return (
      <html lang="fr">
        <body>{children}</body>
      </html>
    );
  }

  return (
    <html lang="fr">
      <body>
        <MsalProvider instance={pca}>
          {children}
        </MsalProvider>
      </body>
    </html>
  );
}
