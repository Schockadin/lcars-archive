import localFont from "next/font/local";

// Lokal gebündelte WOFF2-Dateien verhindern Netzwerkzugriffe beim Netlify-
// Build. Herkunft und Lizenzen sind in ./fonts/README.md dokumentiert.
export const antonio = localFont({
  src: "./fonts/antonio-latin.woff2",
  weight: "100 700",
  variable: "--font-antonio",
});

export const shareTechMono = localFont({
  src: "./fonts/share-tech-mono-latin.woff2",
  weight: "400",
  variable: "--font-share-tech-mono",
});

export const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  weight: "100 900",
  variable: "--font-inter",
  preload: false,
});

export const roboto = localFont({
  src: "./fonts/roboto-latin.woff2",
  weight: "100 900",
  variable: "--font-roboto",
  preload: false,
});

export const openSans = localFont({
  src: "./fonts/open-sans-latin.woff2",
  weight: "300 800",
  variable: "--font-open-sans",
  preload: false,
});

export const jetBrainsMono = localFont({
  src: "./fonts/jetbrains-mono-latin.woff2",
  weight: "100 800",
  variable: "--font-jetbrains-mono",
  preload: false,
});

export const robotoMono = localFont({
  src: "./fonts/roboto-mono-latin.woff2",
  weight: "100 700",
  variable: "--font-roboto-mono",
  preload: false,
});

export const sourceCodePro = localFont({
  src: "./fonts/source-code-pro-latin.woff2",
  weight: "200 900",
  variable: "--font-source-code-pro",
  preload: false,
});