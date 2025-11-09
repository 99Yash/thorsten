import { Source_Code_Pro } from "next/font/google";
import localFont from "next/font/local";

export const GTWalsheim = localFont({
  display: "swap",
  variable: "--font-sans",
  src: [
    {
      path: "./GT-Walsheim-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "./GT-Walsheim-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./GT-Walsheim-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./GT-Walsheim-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
});

export const SourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});
