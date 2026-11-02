'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LIST_LABEL, listHref, parseList, PROFILE_LISTS } from '@/lib/profile-lists';

const linkClass = 'shrink-0 text-sm whitespace-nowrap transition-colors';

export function HeaderNav() {
  const pathname = usePathname();
  const list = parseList(useSearchParams().get('lista'));
  const onProfile = pathname === '/perfil';

  const links = [
    { href: '/', label: 'Início', current: pathname === '/' },
    ...PROFILE_LISTS.map((l) => ({
      href: listHref(l),
      label: LIST_LABEL[l],
      current: onProfile && list === l,
    })),
  ];

  return (
    <ul className="trilho flex gap-5 overflow-x-auto">
      {links.map((l) => (
        <li key={l.href}>
          <Link
            href={l.href}
            aria-current={l.current ? 'page' : undefined}
            className={`${linkClass} ${
              l.current ? 'font-bold text-tela' : 'text-tela/70 hover:text-tela'
            }`}
          >
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
