import './globals.css';

export const metadata = {
  title: 'Approbation de Factures Conteneurs Experts',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
