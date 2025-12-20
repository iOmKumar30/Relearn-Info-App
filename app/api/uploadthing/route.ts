import { createRouteHandler } from "uploadthing/next";
import { myFileRouter } from "./core";

export const { GET, POST } = createRouteHandler({
  router: myFileRouter,
});
