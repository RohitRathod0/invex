/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            { protocol: "https", hostname: "images.unsplash.com" },
            { protocol: "https", hostname: "randomuser.me" },
        ],
    },
    typescript: { ignoreBuildErrors: true },
    async rewrites() {
        return [
            {
                source: "/api/v1/:path*",
                destination: "http://localhost:8000/api/v1/:path*",
            },
        ];
    },
};

export default nextConfig;
