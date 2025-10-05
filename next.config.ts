import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fix for @mediapipe/pose missing export
      config.resolve.alias = {
        ...config.resolve.alias,
        "@mediapipe/pose": false,
      };

      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
  // Transpile TensorFlow.js packages
  transpilePackages: [
    "@tensorflow/tfjs",
    "@tensorflow/tfjs-core",
    "@tensorflow/tfjs-backend-webgl",
    "@tensorflow-models/pose-detection",
    "ably",
  ],
};

export default nextConfig;
