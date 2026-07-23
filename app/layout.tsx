import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'Approbation Factures v2',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
