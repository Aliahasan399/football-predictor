import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'bn', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'always',
});
