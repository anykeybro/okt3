export const config = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL_WEB || 'http://localhost:3001/api',
    timeout: 10000,
  },
  app: {
    name: 'OK-Telecom',
    description: 'Интернет-провайдер OK-Telecom',
    port: 3003,
  },
  auth: {
    sessionTimeout: 30 * 60 * 1000, // 30 минут
    phoneVerificationTimeout: 5 * 60 * 1000, // 5 минут
  },
  payment: {
    robokassa: {
      merchantId: process.env.NEXT_PUBLIC_ROBOKASSA_MERCHANT_ID || '',
      testMode: process.env.NODE_ENV !== 'production',
    },
  },
  ui: {
    itemsPerPage: 10,
    debounceDelay: 300,
  },
  validation: {
    phoneRegex: /^(\+7|8)?[\s\-]?\(?[489][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/,
    minPasswordLength: 6,
  },
} as const;