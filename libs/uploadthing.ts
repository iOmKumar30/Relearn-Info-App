import type { myFileRouter } from "@/app/api/uploadthing/core";
import {
  generateReactHelpers,
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";

export const UploadButton = generateUploadButton<myFileRouter>();
export const UploadDropzone = generateUploadDropzone<myFileRouter>();
export const { useUploadThing } = generateReactHelpers<myFileRouter>();
