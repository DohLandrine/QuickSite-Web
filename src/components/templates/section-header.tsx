import type { ReactNode } from "react";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  rightBadge?: ReactNode;
};

export default function SectionHeader({
  title,
  subtitle,
  rightBadge,
}: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        {subtitle ? (
          <p className="mt-2 text-slate-400 leading-relaxed">{subtitle}</p>
        ) : null}
      </div>

      {rightBadge ? (
        <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-xs font-medium text-slate-300">
          {rightBadge}
        </span>
      ) : null}
    </div>
  );
}
