import type { ReactNode } from "react";

export type Crumb = {
  label: string;
  href?: string;
};

export type TabHeaderProps = {
  /** Main page title, rendered as h1. */
  title: string;
  /** Short one-liner underneath the title. */
  subtitle?: string;
  /** Breadcrumb trail, rendered above the title in mono caps. */
  crumbs?: Crumb[];
  /** Right-aligned action buttons / filter chips. */
  actions?: ReactNode;
};

/**
 * Reusable header for every tab inside the dashboard. Keeps the typographic
 * rhythm (mono caps crumb → large title → muted subtitle) consistent across
 * the four analysis tabs and any future corpus tabs.
 */
export function TabHeader({ title, subtitle, crumbs, actions }: TabHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-6 pb-6 border-b border-line mb-6">
      <div className="min-w-0">
        {crumbs && crumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="mb-2">
            <ol className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-text-3">
              {crumbs.map((crumb, idx) => (
                <li key={`${crumb.label}-${idx}`} className="flex items-center gap-1.5">
                  {idx > 0 ? <span aria-hidden>/</span> : null}
                  {crumb.href ? (
                    <a href={crumb.href} className="hover:text-text-2">
                      {crumb.label}
                    </a>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight truncate">{title}</h1>
        {subtitle ? (
          <p className="text-sm text-text-2 mt-1 max-w-2xl">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
    </header>
  );
}
