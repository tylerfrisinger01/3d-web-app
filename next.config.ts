import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
};

export default nextConfig;


// images: {
//     remotePatterns: [
//       {
//         protocol: 'https',
//         hostname: 'your-database-images.com', // Replace with your actual image host
//         port: '',
//         pathname: '/**',
//       },
//     ],
//   },