import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export const getRequestConfig = getRequestConfig({
  locales: routing.locales,
  defaultLocale: routing.defaultLocale,
  localePrefix: routing.localePrefix,
});
