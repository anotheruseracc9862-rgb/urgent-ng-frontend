import { cn } from '@urgent/ui';

/** Eyebrow, title and subtitle block shared by landing sections (demo `.section-header`). */
export function SectionHeader({
  tag,
  title,
  subtitle,
  className,
}: {
  tag?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto mb-12 flex max-w-[680px] flex-col items-center gap-1.5 text-center', className)}>
      {tag ? (
        <span className="text-xs font-bold uppercase tracking-[0.08em] text-cn-green-600">{tag}</span>
      ) : null}
      <h2 className="text-[26px] font-bold leading-[1.25] tracking-[-0.02em] text-cn-blue-700 md:text-4xl">
        {title}
      </h2>
      {subtitle ? <p className="text-base leading-relaxed text-cn-blue-500">{subtitle}</p> : null}
    </div>
  );
}
