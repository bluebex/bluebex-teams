import Link from "next/link";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  children?: React.ReactNode;
};

export function PageHeader({ title, subtitle, backHref, backLabel, children }: PageHeaderProps) {
  return (
    <header className="bb-page-header">
      <div className="bb-page-header-main">
        {backHref ? (
          <Link className="bb-back-link" href={backHref}>
            {backLabel ?? "← Back"}
          </Link>
        ) : null}
        <h1 className="bb-admin-title">{title}</h1>
        {subtitle ? <p className="bb-page-subtitle">{subtitle}</p> : null}
      </div>
      {children ? <div className="bb-page-actions">{children}</div> : null}
    </header>
  );
}
