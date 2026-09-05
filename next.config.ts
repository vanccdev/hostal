import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/storage/v1/object/public/habitaciones/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/storage/v1/object/public/comprobante/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/storage/v1/object/public/habitaciones/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/storage/v1/object/public/comprobante/**",
      },
      {
        protocol: "https",
        hostname: "api.hostalplazacamargo.digital",
        pathname: "/storage/v1/object/public/habitaciones/**",
      },
      {
        protocol: "https",
        hostname: "api.hostalplazacamargo.digital",
        pathname: "/storage/v1/object/public/comprobante/**",
      },
    ],
  },
};

export default nextConfig;
