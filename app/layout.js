import "./globals.css";
import ErpAppShell from "../components/ErpAppShell";
import ApiSyncProvider from "../components/ApiSyncProvider";
import ErpUiEnhancer from "../components/ErpUiEnhancer";

export const metadata = {
  title: "ERP System Navbar",
  description: "Navbar design recreated in Next.js and Tailwind CSS",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ApiSyncProvider>
          <ErpUiEnhancer />
          <ErpAppShell>{children}</ErpAppShell>
        </ApiSyncProvider>
      </body>
    </html>
  );
}
