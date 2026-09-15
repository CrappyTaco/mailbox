import type { Metadata, Viewport } from 'next';
import './globals.css';
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#cce1e8',
};
export const metadata: Metadata = {
  title: 'Our Mailbox',
  description: 'Letters for Indi and Auggie.',
  robots: { index: false, follow: false },
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {['target', 'target-clean'].map((tone) => (
          <link
            key={tone}
            rel="preload"
            as="image"
            href={`/world/reference/${tone}.png`}
          />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}
