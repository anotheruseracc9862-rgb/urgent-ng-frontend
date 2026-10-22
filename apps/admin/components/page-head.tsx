import type { ReactNode } from 'react';

/** Admin-owned copy of the signed-in web heading, independent of consumer components. */
export function PageHead({ eyebrow, title, description, actions }: { eyebrow?: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return <header className="page-heading">
    <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p>{description}</p>}</div>
    {actions && <div className="toolbar">{actions}</div>}
  </header>;
}
