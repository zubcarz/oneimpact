export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold">One Impact · Admin</h1>
        <p className="mb-6 text-sm text-gray-500">Inicia sesión para gestionar proyectos.</p>
        <form className="flex flex-col gap-3">
          <input className="rounded-2xl border border-black/5 bg-cream px-4 py-3" placeholder="Email" type="email" />
          <input className="rounded-2xl border border-black/5 bg-cream px-4 py-3" placeholder="Contraseña" type="password" />
          <button className="mt-2 rounded-full bg-gray-900 py-3 font-semibold text-white" type="button">
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
