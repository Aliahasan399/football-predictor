import createNextIntlPlugin from 'next-intl/plugin';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@vercel/analytics', '@vercel/speed-insights', 'lucide-react', 'recharts'],
};

export default createNextIntlPlugin('./i18n/request.js')(nextConfig);
