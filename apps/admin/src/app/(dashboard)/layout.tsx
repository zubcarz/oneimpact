import Link from 'next/link';

const nav = [
  { href: '/dashboard', label: 'Métricas' },
  { href: '/projects', label: 'Proyectos' },
  { href: '/zones', label: 'Zonas' },
  { href: '/users', label: 'Usuarios' },
  { href: '/subscriptions', label: 'Suscripciones' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 bg-forest p-6 text-white">
        <div className="mb-8 text-lg font-black">one impact</div>
        <nav className="flex flex-col gap-1">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-full px-4 py-2 text-sm text-white/80 hover:bg-white/10">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
