export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/",
    "/agents/:path*",
    "/security/:path*",
    "/costs/:path*",
    "/timeline/:path*",
    "/settings/:path*",
  ],
};
