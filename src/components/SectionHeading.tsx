interface Props {
  step: number;
  title: string;
  className?: string;
}

/** Numbered step heading shared by every section of the page. */
export function SectionHeading({ step, title, className = 'mb-3' }: Props) {
  return (
    <h2
      className={`${className} flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500`}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600">
        {step}
      </span>
      {title}
    </h2>
  );
}
