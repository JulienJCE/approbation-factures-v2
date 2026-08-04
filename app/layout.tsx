import './globals.css';

export const metadata = {
  title: 'APPRO — Conteneurs Experts',
  description: 'Approbation des factures et des dépenses Visa',
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
