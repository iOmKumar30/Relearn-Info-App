"use client";

import Image from "next/image";

type Signer = {
  name: string;
  title: string;
  subtitle?: string;
  signSrc: string;
};

type Props = {
  certificateNo: string;
  name: string;
  aadhaar?: string;
  classYear: string;
  institute: string;
  duration: string;
  startDate: string | Date;
  endDate: string | Date;
  issueDate: string | Date;

  leftSigner?: Signer;
  rightSigner?: Signer;
  logoSrc?: string;
  watermarkSrc?: string;
};

// --- Defaults ---
const defaultLeft: Signer = {
  name: "Mita Tarafder",
  title: "Founder Trustee,",
  subtitle: "Relearn Foundation",
  signSrc: "/certificates/assets/sign_left.png", 
};

const defaultRight: Signer = {
  name: "Prof. Prabal K. Sen",
  title: "Chairman,",
  subtitle: "Relearn Foundation",
  signSrc: "/certificates/assets/sign_right.png",
};

const defaultLogo = "/certificates/assets/logo.png";
const defaultWatermark = "/certificates/assets/watermark.png";

// Helper to format dates consistently
const formatDate = (date: string | Date) => {
  if (!date) return "";
  const d = new Date(date);
  // Fallback if date string is already formatted or invalid
  return isNaN(d.getTime())
    ? String(date)
    : d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
};

export default function CertificateCard({
  certificateNo,
  name,
  aadhaar,
  classYear,
  institute,
  duration,
  startDate,
  endDate,
  issueDate,
  leftSigner = defaultLeft,
  rightSigner = defaultRight,
  logoSrc = defaultLogo,
  watermarkSrc = defaultWatermark, // Using logo as watermark by default
}: Props) {
  return (
    <div
      id="certificate-root"
      className="relative mx-auto bg-white text-gray-800 shadow-lg overflow-hidden print:shadow-none print:m-0"
      style={{
        width: "1123px", // A4 Landscape width @ 96dpi
        height: "794px", // A4 Landscape height @ 96dpi
        fontFamily: "'Times New Roman', serif",
      }}
    >
      {/* --- BLUE BORDER FRAME --- */}
      <div className="absolute inset-4 border-[12px] border-[#1e2e5c] pointer-events-none z-20"></div>

      {/* --- BACKGROUND WATERMARK --- */}
      <div className="absolute inset-0 flex items-center justify-center opacity-50 pointer-events-none z-0">
        <div className="relative w-[600px] h-[600px]">
          <Image
            src={watermarkSrc}
            alt="Watermark"
            fill
            className="object-contain grayscale"
          />
        </div>
      </div>

      {/* --- CONTENT CONTAINER --- */}
      <div className="relative z-10 h-full flex flex-col items-center justify-between py-16 px-24 text-center">
        {/* TOP RIGHT NUMBER */}
        <div className="absolute top-10 right-14 text-lg font-semibold text-gray-600">
          No: {certificateNo || "__________"}
        </div>

        {/* HEADER */}
        <div className="mt-8 space-y-4">
          <h1 className="text-5xl font-bold text-[#8b7e4e] tracking-wide uppercase">
            Participation Certificate
          </h1>
          <p className="text-xl text-gray-500 font-medium tracking-widest uppercase mt-4">
            This is to certify that
          </p>
        </div>

        {/* NAME SECTION */}
        <div className="mt-2 w-full">
          <h2 className="text-6xl font-bold text-[#8b7e4e] mb-2 capitalize px-4">
            {name}
          </h2>
          {aadhaar && (
            <p className="text-xl text-gray-600">
              (Aadhaar Number <span className="font-bold">{aadhaar}</span>)
            </p>
          )}
        </div>

        {/* BODY TEXT */}
        <div className="max-w-5xl text-[26px] leading-relaxed text-gray-700 space-y-1">
          <p>
            student of <span className="font-bold text-black">{classYear}</span>{" "}
            <span className="font-bold text-black">{institute}</span> has
            successfully completed
          </p>
          <p>
            <span className="font-bold text-black">{duration}</span> of
            voluntary service
          </p>
          <p>
            at <span className="font-bold text-black">Relearn Foundation</span>{" "}
            from
          </p>
          <p>
            <span className="font-bold text-black">
              {formatDate(startDate)}
            </span>{" "}
            to{" "}
            <span className="font-bold text-black">{formatDate(endDate)}</span>.
          </p>

          <div className="pt-4 px-12">
            <p className="text-[19px] text-gray-600 italic leading-snug">
              During this period, she/he participated actively in the assigned
              activities, carried out her/his responsibilities with sincerity,
              and maintained good conduct and punctuality.
            </p>
          </div>
        </div>

        {/* ISSUE DATE */}
        <div className="mt-2 text-xl font-medium text-gray-500">
          Issued On: <span className="font-bold">{formatDate(issueDate)}</span>
        </div>

        {/* FOOTER - SIGNATURES & LOGO */}
        <div className="w-full flex items-end justify-between mt-8">
          {/* LEFT SIGNER */}
          <div className="flex flex-col items-center w-64">
            <div className="h-16 w-40 relative mb-2">
              <Image
                src={leftSigner.signSrc}
                alt="Signature Left"
                fill
                className="object-contain"
              />
            </div>
            <div className="w-full h-px bg-gray-400 mb-2"></div>
            <p className="font-bold text-lg text-gray-800">{leftSigner.name}</p>
            <p className="text-gray-600">{leftSigner.title}</p>
            {leftSigner.subtitle && (
              <p className="text-gray-600">{leftSigner.subtitle}</p>
            )}
          </div>

          {/* CENTER LOGO */}
          <div className="flex flex-col items-center pb-2">
            <div className="h-28 w-28 relative">
              <Image
                src={logoSrc}
                alt="Relearn Logo"
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* RIGHT SIGNER */}
          <div className="flex flex-col items-center w-64">
            <div className="h-16 w-40 relative mb-2">
              <Image
                src={rightSigner.signSrc}
                alt="Signature Right"
                fill
                className="object-contain"
              />
            </div>
            <div className="w-full h-px bg-gray-400 mb-2"></div>
            <p className="font-bold text-lg text-gray-800">
              {rightSigner.name}
            </p>
            <p className="text-gray-600">{rightSigner.title}</p>
            {rightSigner.subtitle && (
              <p className="text-gray-600">{rightSigner.subtitle}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
