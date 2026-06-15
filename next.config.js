import createNextIntlPlugin from 'next-intl/plugin';
import { withCloudflare } from '@cloudflare/next-on-pages';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@vercel/analytics', '@vercel/speed-insights', 'lucide-react', 'recharts'],
};

export default withCloudflare(createNextIntlPlugin('./i18n/request.js')(nextConfig));
