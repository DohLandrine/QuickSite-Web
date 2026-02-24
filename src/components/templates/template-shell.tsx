import type { CSSProperties, ReactNode } from "react";

type TemplateShellProps = {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  style?: CSSProperties;
};

export default function TemplateShell({
  children,
  className,
  containerClassName,
  style,
}: TemplateShellProps) {
  const shellClassName = ["min-h-screen bg-slate-950 text-white", className]
    .filter(Boolean)
    .join(" ");

  const innerClassName = ["mx-auto max-w-5xl px-6", containerClassName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClassName} style={style}>
      <div className={innerClassName}>{children}</div>
    </div>
  );
}
