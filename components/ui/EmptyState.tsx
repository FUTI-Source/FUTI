import type { ReactNode } from "react";
import { FileText } from "lucide-react";

/**
 * 无内容时的友好占位。样式全部由 UnoCSS 原子类提供，
 * 颜色用语义令牌（text-heading / text-text-alt / text-brand / bg-bg-alt）自动适配深浅色。
 */
export function EmptyState({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 sm:py-28 animate">
      <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-bg-alt text-brand ring-1 ring-border">
        {icon ?? <FileText className="h-12 w-12" strokeWidth={1.5} aria-hidden="true" />}
      </div>
      <h2 className="font-sans text-3xl font-bold tracking-[-1px] text-heading sm:text-4xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-3 max-w-md font-sans text-base text-text-alt">{subtitle}</p>
      ) : null}
      {action ? <div className="mt-8">{action}</div> : null}
    </div>
  );
}
