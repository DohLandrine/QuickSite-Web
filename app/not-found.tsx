import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { PAY_THEME, PLAY_STORE_URL } from "@/src/lib/constants";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export default function NotFound() {
  const downloadHref = PLAY_STORE_URL || "/#download";
  const isDownloadExternal = isExternalUrl(downloadHref);

  return (
    <main
      className={`${plusJakarta.className} flex min-h-screen items-center justify-center px-6 py-10`}
      style={{ backgroundColor: PAY_THEME.background, color: PAY_THEME.emphasis }}
    >
      <div
        className="w-full max-w-xl rounded-3xl border border-[#f2ba78] p-8 text-center md:p-10"
        style={{ background: "linear-gradient(160deg, #fff8e8 0%, #fffdf1 100%)" }}
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#8f4f14]">
          QuickSite
        </p>
        <h1 className="text-3xl font-extrabold md:text-4xl">
          This page is not available
        </h1>
        <p className="mt-3 text-sm text-[#8f4f14] md:text-base">
          It may be unpublished or the link is wrong.
        </p>

        <a
          href={downloadHref}
          {...(isDownloadExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="mt-7 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-bold transition-transform hover:-translate-y-0.5"
          style={{ backgroundColor: PAY_THEME.accent, color: PAY_THEME.emphasis }}
        >
          Create your own website with QuickSite
        </a>

        <div className="mt-4">
          <Link
            href="/"
            className="text-sm font-semibold underline decoration-[#8f4f14] underline-offset-4"
          >
            Go to QuickSite Home
          </Link>
        </div>

        <p className="mt-8 text-xs text-[#8f4f14]">
          QuickSite • Your website link in minutes
        </p>
      </div>
    </main>
  );
}
