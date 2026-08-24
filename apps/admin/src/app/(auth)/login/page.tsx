import type { Metadata } from 'next';
import Image from 'next/image';
import { LoginForm } from '@/features/auth/LoginForm';

/**
 * Login screen. Server Component: it only lays out the card and delegates every
 * interactive part to `LoginForm`, the single `'use client'` boundary here.
 */

export const metadata: Metadata = {
  title: 'Entrar · One Impact Admin',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-16">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
        {/*
          `next/image` serves an `.svg` as is instead of sending it through the
          optimizer, so the wordmark keeps its vectors and needs no config.
          The `alt` is empty on purpose: the name is already in the heading and
          repeating it would make a screen reader read it twice.
        */}
        <Image src="/logo_negro.svg" alt="" width={148} height={44} priority />

        <h1 className="mt-8 text-2xl font-bold text-gray-900">Panel de administración</h1>
        <p className="mt-2 mb-8 text-sm text-gray-600">
          Entra con tu cuenta de administrador para gestionar proyectos, zonas y suscripciones.
        </p>

        <LoginForm />
      </div>
    </main>
  );
}
