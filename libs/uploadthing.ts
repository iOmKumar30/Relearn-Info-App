import type { myFileRouter } from "@/app/api/uploadthing/core";
import {
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";

export const UploadButton = generateUploadButton<myFileRouter>();
export const UploadDropzone = generateUploadDropzone<myFileRouter>();
