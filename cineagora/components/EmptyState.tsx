import type { ReactNode } from 'react';

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-16 text-center">
      <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
      {message && <p className="text-zinc-400">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
