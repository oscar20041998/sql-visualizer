import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import '@/styles/tailwind.css';
import { Toaster } from 'sonner';

const geistSans = Geist({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-geist-sans',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'SQL Visualizer — Query Analyzer',
  description:
    'SQL Visualizer is a powerful tool for analyzing SQL queries, providing insights into query complexity, performance, and optimization opportunities.' +
    ' It helps developers and database administrators understand the structure and efficiency of their SQL statements, making it easier to optimize and improve database performance.' +
    ' With SQL Visualizer, you can visualize query execution plans, identify potential bottlenecks, and gain a deeper understanding of how your SQL queries interact with the database.' +
    ' Whether you are a developer looking to optimize your code or a database administrator seeking to enhance database performance, SQL Visualizer is the ultimate tool for analyzing and improving your SQL queries.' +
    ' It provides a user-friendly interface and powerful analysis features to help you make informed decisions about your SQL queries and database performance.' +
    ' SQL Visualizer is designed to be a comprehensive solution for SQL query analysis, offering a range of features to help you understand and optimize your SQL statements.' +
    ' It is suitable for developers, database administrators, and anyone looking to improve the performance and efficiency of their SQL queries.' +
    ' With SQL Visualizer, you can gain valuable insights into your SQL queries, identify areas for improvement, and make data-driven decisions to enhance your database performance.' +
    ' It is a must-have tool for anyone working with SQL and looking to optimize their database operations.',
  icons: {
    icon: [
      { url: '/assets/images/app_logo.png', type: 'image/png' },
      { url: '/assets/images/app_logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/assets/images/app_logo.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/assets/images/app_logo.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className={geistSans.className}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--card)',
              color: 'var(--card-foreground)',
              border: '1px solid var(--border)',
              fontFamily: 'var(--font-sans)',
            },
          }}
        />

        <script
          type="module"
          async
          src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fsqlvisuali1763back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.19"
        />
        <script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.2" />
      </body>
    </html>
  );
}
