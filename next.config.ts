import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 교실 내 다른 기기(휴대폰 등)가 같은 Wi-Fi의 이 PC IP로 개발 서버에 접속해
  // 테스트할 수 있도록 허용한다.
  allowedDevOrigins: ["192.168.45.142"],
};

export default nextConfig;
