import { authOptions } from "@/libs/authOptions";
import { getServerSession } from "next-auth";
import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const myFileRouter = {
  projectReport: f({ pdf: { maxFileSize: "8MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.ufsUrl || file.url);
      return { uploadedBy: metadata.userId };
    }),
  profilePhoto: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.info("PROFILE_PHOTO_UPLOADED", {
        userId: metadata.userId,
        fileKey: file.key,
      });
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;

export type myFileRouter = typeof myFileRouter;
