import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["imap", "nodemailer"],
};

export default nextConfig;
