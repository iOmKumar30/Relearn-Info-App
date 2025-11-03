"use client";

import Image from "next/image";

type Props = {
  name: string;
  year: string;
  date: string; // yyyy-mm-dd or formatted already
  // Optional overrides
  leftSigner?: { name: string; title: string; signSrc: string };
  rightSigner?: { name: string; title: string; signSrc: string };
  logoSrc?: string;
};

// Default text from your screenshot
const defaultLeft = {
  name: "MITA TARAFDER",
  title: "Chief, Relearn Foundation",
  signSrc: "/certificates/assets/sign_left.png",
};
const defaultRight = {
  name: "PRABAL KUMAR SEN",
  title: "Chairman, Relearn Foundation",
  signSrc: "/certificates/assets/sign_right.png",
};
const defaultLogo = "/certificates/assets/logo.png";

export default function CertificateCard({
  name,
  year,
  date,
  leftSigner = defaultLeft,
  rightSigner = defaultRight,
  logoSrc = defaultLogo,
}: Props) {
  // Container is A4-ish aspect ratio; we render as a styled card suitable for PDF capture
  return (
    <div
      id="certificate-root"
      className="relative mx-auto w-[980px] max-w-full bg-white"
      style={{
        border: "6px double #333",
        padding: "36px",
      }}
    >
      {/* Title */}
      <div className="text-center">
        <div className="text-[22px] tracking-wide font-semibold text-[#b5122b]">
          CERTIFICATE OF MEMBERSHIP
        </div>
        <div className="mt-4 text-[14px] text-gray-700">This is awarded to</div>
        <div className="mt-2 text-[42px] font-semibold tracking-wide">
          {name}
        </div>
        <div className="mt-4 text-[14px] text-gray-700">
          for his/her membership of {year} at the
          <br />
          Relearn Foundation
        </div>
        <div className="mt-2 text-[12px] text-gray-600">
          (NGO Darpan ID: JH/2017/0115958) on{" "}
          {new Date(date).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
      </div>

      {/* Bottom section with signatures and logo */}
      <div className="mt-14 grid grid-cols-3 items-end gap-6">
        {/* Left signer */}
        <div className="flex flex-col items-center">
          <div className="h-14 w-40 relative">
            <Image
              src={leftSigner.signSrc}
              alt="Left Signature"
              fill
              className="object-contain"
              sizes="160px"
            />
          </div>
          <div className="mt-2 h-[2px] w-56 bg-gray-800" />
          <div className="mt-1 text-xs font-semibold tracking-wide">
            {leftSigner.name}
          </div>
          <div className="text-[11px] text-gray-600">{leftSigner.title}</div>
        </div>

        {/* Logo centre */}
        <div className="flex flex-col items-center">
          <div className="h-16 w-28 relative">
            <Image
              src={logoSrc}
              alt="Logo"
              fill
              className="object-contain"
              sizes="112px"
            />
          </div>
        </div>

        {/* Right signer */}
        <div className="flex flex-col items-center">
          <div className="h-14 w-40 relative">
            <Image
              src={rightSigner.signSrc}
              alt="Right Signature"
              fill
              className="object-contain"
              sizes="160px"
            />
          </div>
          <div className="mt-2 h-[2px] w-56 bg-gray-800" />
          <div className="mt-1 text-xs font-semibold tracking-wide">
            {rightSigner.name}
          </div>
          <div className="text-[11px] text-gray-600">{rightSigner.title}</div>
        </div>
      </div>
    </div>
  );
}
