import type { Metadata } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'OK-Telecom - Интернет-провайдер',
  description: 'Высокоскоростной интернет, IPTV и облачные услуги от OK-Telecom. Подключение и оплата онлайн.',
  keywords: 'интернет, провайдер, IPTV, облачное хранилище, подключение интернета, оплата онлайн',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}