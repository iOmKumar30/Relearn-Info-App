"use client";

import Image from "next/image";
import { forwardRef } from "react";

type CertificateType = "PARTICIPATION" | "INTERNSHIP" | "TRAINING";

type Signer = {
  name: string;
  title: string;
  subtitle?: string;
  signSrc: string;
};

type Props = {
  type: CertificateType;
  certificateNo: string;
  name: string;
  aadhaar?: string;
  institute: string;
  classYear?: string;
  eventName?: string;
  duration?: string;
  startDate: string | Date;
  endDate: string | Date;
  issueDate: string | Date;
  leftSigner?: Signer;
  rightSigner?: Signer;
  logoSrc?: string;
  watermarkSrc?: string;
};

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

const formatDate = (date: string | Date) => {
  if (!date) return "";
  const d = new Date(date);
  return isNaN(d.getTime())
    ? String(date)
    : d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
};

const CertificateCard = forwardRef<HTMLDivElement, Props>(
  (
    {
      type = "PARTICIPATION",
      certificateNo,
      name,
      aadhaar,
      classYear,
      institute,
      eventName,
      duration,
      startDate,
      endDate,
      issueDate,
      leftSigner = defaultLeft,
      rightSigner = defaultRight,
      logoSrc = defaultLogo,
      watermarkSrc = defaultWatermark,
    },
    ref
  ) => {
    let headerTitle = "PARTICIPATION CERTIFICATE";
    let headerColor = "text-[#8b7e4e]";

    if (type === "INTERNSHIP") {
      headerTitle = "INTERNSHIP CERTIFICATE";
      headerColor = "text-[#D32F2F]";
    } else if (type === "TRAINING") {
      headerTitle = "TRAINING CERTIFICATE";
      headerColor = "text-[#1976D2]";
    }

    return (
      <div
        ref={ref}
        id="certificate-root"
        className="relative mx-auto bg-white text-gray-800 shadow-lg overflow-hidden print:shadow-none print:m-0"
        style={{
          width: "1123px",
          height: "794px",
          fontFamily: "'Times New Roman', serif",
        }}
      >
        {/* --- BLUE BORDER FRAME --- */}
        {/* Increased border width slightly visually if needed, but inset-4 is good. 
          The key is keeping content away from this border. */}
        <div className="absolute inset-5 border-12 border-[#1e2e5c] pointer-events-none z-20"></div>

        {/* --- BACKGROUND WATERMARK --- */}
        <div className="absolute inset-0 flex items-center justify-center opacity-50 pointer-events-none z-0">
          <div className="relative w-[550px] h-[550px]">
            <Image
              src={watermarkSrc}
              alt="Watermark"
              fill
              className="object-contain grayscale"
            />
          </div>
        </div>

        {/* --- CONTENT CONTAINER --- */}
        {/* Increased padding x-24 -> x-28 to push content inward */}
        <div className="relative z-10 h-full flex flex-col items-center justify-between py-14 px-28 text-center">
          {/* TOP RIGHT NUMBER - Adjusted position to be safer inside border */}
          <div className="absolute top-12 right-16 text-lg font-semibold text-gray-600">
            No: {certificateNo || "__________"}
          </div>

          {/* HEADER */}
          <div className="mt-6 space-y-3">
            <h1
              className={`text-5xl font-bold tracking-wide uppercase ${headerColor}`}
            >
              {headerTitle}
            </h1>
            <p className="text-xl text-gray-500 font-medium tracking-widest uppercase mt-3">
              This is to certify that
            </p>
          </div>

          {/* NAME SECTION */}
          <div className="mt-1 w-full">
            <h2
              className={`text-6xl font-bold mb-1 capitalize px-4 ${headerColor}`}
            >
              {name}
            </h2>
            {aadhaar && (
              <p className="text-lg text-gray-600">
                (Aadhaar Number <span className="font-bold">{aadhaar}</span>)
              </p>
            )}
          </div>

          {/* --- BODY TEXT --- */}
          {/* Reduced text size from [26px] to [22px] (approx text-2xl) to prevent overflow */}
          <div className="max-w-5xl text-[22px] leading-relaxed text-gray-700 space-y-1">
            {type === "PARTICIPATION" && (
              <>
                <p>
                  student of{" "}
                  <span className="font-bold text-black">{classYear}</span>{" "}
                  <span className="font-bold text-black">{institute}</span> has
                  successfully completed
                </p>
                <p>
                  <span className="font-bold text-black">{duration}</span> of
                  voluntary service
                </p>
              </>
            )}

            {type === "INTERNSHIP" && (
              <>
                <p>
                  student of{" "}
                  <span className="font-bold text-black">{classYear}</span>,{" "}
                  <span className="font-bold text-black">{institute}</span> has
                  successfully completed
                </p>
                <p>
                  <span className="font-bold text-black">Internship</span>
                </p>
              </>
            )}

            {type === "TRAINING" && (
              <>
                <p>
                  employee of{" "}
                  <span className="font-bold text-black">{institute}</span> has
                  successfully completed
                </p>
                <p>Training/Workshop/Seminar/Campaign</p>
                {eventName && (
                  <p>
                    On <span className="font-bold text-black">{eventName}</span>
                  </p>
                )}
              </>
            )}

            <p>
              at{" "}
              <span className="font-bold text-black">Relearn Foundation</span>{" "}
              from
            </p>
            <p>
              <span className="font-bold text-black">
                {formatDate(startDate)}
              </span>{" "}
              to{" "}
              <span className="font-bold text-black">
                {formatDate(endDate)}
              </span>
              .
            </p>

            <div className="pt-3 px-8">
              <p className="text-[17px] text-gray-600 italic leading-snug">
                During this period, she/he participated actively in the assigned
                activities, carried out her/his responsibilities with sincerity,
                and maintained good conduct and punctuality.
              </p>
            </div>
          </div>

          {/* ISSUE DATE */}
          <div className="mt-1 text-lg font-medium text-gray-500">
            Issued On:{" "}
            <span className="font-bold">{formatDate(issueDate)}</span>
          </div>

          {/* FOOTER - SIGNATURES & LOGO */}
          {/* Added px-8 to ensure signatures don't touch the sides */}
          <div className="w-full flex items-end justify-between mt-6 px-8">
            {/* LEFT SIGNER */}
            <div className="flex flex-col items-center w-60">
              <div className="h-14 w-36 relative mb-1">
                <Image
                  src={leftSigner.signSrc}
                  alt="Signature Left"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="w-full h-px bg-gray-400 mb-1"></div>
              <p className="font-bold text-base text-gray-800">
                {leftSigner.name}
              </p>
              <p className="text-sm text-gray-600">{leftSigner.title}</p>
              {leftSigner.subtitle && (
                <p className="text-sm text-gray-600">{leftSigner.subtitle}</p>
              )}
            </div>

            {/* CENTER LOGO */}
            <div className="flex flex-col items-center pb-1">
              <div className="h-24 w-24 relative">
                <Image
                  src={logoSrc}
                  alt="Relearn Logo"
                  fill
                  className="object-contain"
                />
              </div>
            </div>

            {/* RIGHT SIGNER */}
            <div className="flex flex-col items-center w-60">
              <div className="h-14 w-36 relative mb-1">
                <Image
                  src={rightSigner.signSrc}
                  alt="Signature Right"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="w-full h-px bg-gray-400 mb-1"></div>
              <p className="font-bold text-base text-gray-800">
                {rightSigner.name}
              </p>
              <p className="text-sm text-gray-600">{rightSigner.title}</p>
              {rightSigner.subtitle && (
                <p className="text-sm text-gray-600">{rightSigner.subtitle}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CertificateCard.displayName = "CertificateCard";
export default CertificateCard;
