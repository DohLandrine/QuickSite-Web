import type { ReactNode } from "react";
import { motion } from "framer-motion";

type SectionSpacing = "py-16" | "py-14" | "py-12" | "py-10" | "py-8";

type TemplateSectionProps = {
  children: ReactNode;
  className?: string;
  divider?: boolean;
  spacing?: SectionSpacing;
};

const SECTION_ENTRY = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.35, ease: "easeOut" as const },
};

export default function TemplateSection({
  children,
  className,
  divider = true,
  spacing = "py-12",
}: TemplateSectionProps) {
  const sectionClassName = [
    spacing,
    divider ? "border-t border-white/10" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.section {...SECTION_ENTRY} className={sectionClassName}>
      {children}
    </motion.section>
  );
}
