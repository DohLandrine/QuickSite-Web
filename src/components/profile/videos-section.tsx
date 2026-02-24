"use client";

type VideosSectionProps = {
  videos?: string[];
  enabled?: boolean;
  accent?: string;
};

function normalizeVideoUrls(videos: string[]): string[] {
  return videos
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

export default function VideosSection({
  videos = [],
  enabled = false,
  accent: _accent,
}: VideosSectionProps) {
  const safeVideos = normalizeVideoUrls(videos);

  if (!enabled || safeVideos.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {safeVideos.map((url, index) => (
        <div
          key={`${url}-${index}`}
          className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/60 shadow-[0_10px_30px_rgba(2,6,23,0.35)]"
        >
          <video
            controls
            playsInline
            preload="metadata"
            src={url}
            className="h-full w-full"
          />
        </div>
      ))}
    </div>
  );
}
