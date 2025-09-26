'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Providers } from './providers';
import { Layout } from '../shared/ui';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <html lang="ru">
      <body>
        <Providers>
          {isLoginPage ? (
            children
          ) : (
            <Layout>
              {children}
            </Layout>
          )}
        </Providers>
      </body>
    </html>
  );
}