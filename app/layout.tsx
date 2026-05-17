import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Visual or Words?',
  description: 'A quick questionnaire to explore whether you think first in images or words.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
