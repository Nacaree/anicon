import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "AniCon",
  description: "The best Anime Community in Cambodia",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
