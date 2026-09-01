import type { Metadata, Viewport } from 'next';
import { Heebo, Rubik } from 'next/font/google';
import './globals.css';

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-heebo',
  display: 'swap',
});

// Display face for bold/extrabold text only — headlines, meter numbers,
// primary buttons (see the .font-extrabold override in globals.css).
// Everyday body text stays on Heebo.
const rubik = Rubik({
  subsets: ['hebrew', 'latin'],
  weight: ['600', '700', '800', '900'],
  variable: '--font-rubik',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'קבוצת כדורשת | דשבורד קבוצתי',
  description: 'לוח בקרה לקבוצת כדורשת — אימון היום, ספריית תרגילים ומודעות מהמאמנת',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon-32.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#7C2A54',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${rubik.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
