/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_CONTRACT_ADDRESS: "0x80687bBECc6B73b24b9c21DA2324a5de1d584D1E" },
};
module.exports = nextConfig;
