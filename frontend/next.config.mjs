/** @type {import('next').NextConfig} */

// Validate API URL is set in production
if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_API_URL) {
    console.error('ERROR: NEXT_PUBLIC_API_URL environment variable is required for production builds');
    process.exit(1);
}

const nextConfig = {
    output: 'standalone',
    env: {
        // For development, default to localhost; for production, require explicit configuration
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    },
};

export default nextConfig;
