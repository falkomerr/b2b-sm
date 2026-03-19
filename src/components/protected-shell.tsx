"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { useAppStore } from "@/lib/app-store";
import { appRoutes } from "@/lib/app-routes";

export function ProtectedShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { hydrated, session, cartCount } = useAppStore();

  useEffect(() => {
    if (hydrated && !session) {
      router.replace(appRoutes.login);
    }
  }, [hydrated, router, session]);

  if (!hydrated || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="panel flex h-24 w-24 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#d9d9de] border-t-[var(--primary)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-white/60 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-4">
            <Link href={appRoutes.home} className="flex items-center gap-3">
              <Image
                src="/logo.svg"
                alt="Smartfish"
                width={40}
                height={40}
                className="h-10 w-10 rounded-full bg-white p-2 shadow-sm"
              />
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--primary)]">
                  Smartfish
                </p>
                <p className="text-lg font-semibold">B2B кабинет</p>
              </div>
            </Link>
            <div className="hidden h-10 w-px bg-[var(--border)] md:block" />
            <div className="hidden md:block">
              <p className="text-sm font-medium">
                {session.user.companyName ?? session.user.username ?? "Компания"}
              </p>
              <p className="text-xs text-[var(--muted)]">
                Корзина: {cartCount} позиций
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex-1 max-w-7xl px-4 pt-8 pb-28 md:px-6 md:pb-8">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--primary)]">
              B2B workflow
            </p>
            <h1 className="mt-3 text-3xl font-semibold md:text-5xl">{title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)] md:text-base">
              {description}
            </p>
          </div>
        </div>
        {children}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 flex w-full flex-col items-center pb-2 pt-3 md:hidden">
        <div className="w-full max-w-[392px]">
          <MobileTabBar />
        </div>
      </div>

      <div className="hidden pb-6 pt-2 md:block md:px-4">
        <div className="flex justify-center">
          <MobileTabBar />
        </div>
      </div>
    </div>
  );
}
