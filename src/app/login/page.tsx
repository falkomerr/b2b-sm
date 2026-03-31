"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { appRoutes } from "@/lib/app-routes";
import { consumeSessionExpiredNotice, useAppStore } from "@/lib/app-store";

export default function LoginPage() {
  const router = useRouter();
  const { hydrated, session, login } = useAppStore();
  const [form, setForm] = useState({ login: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const fontFamily =
    'SF Pro Text, SF Pro Display, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  useEffect(() => {
    if (hydrated && session) {
      router.replace(appRoutes.home);
    }
  }, [hydrated, router, session]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setNotice(
      consumeSessionExpiredNotice(window.sessionStorage)
        ? "Сессия истекла. Войдите снова."
        : null,
    );
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      await login({
        login: form.login.trim(),
        password: form.password,
      });
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : "Не удалось войти.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily }}>
      <div className="mx-auto flex min-h-screen w-full max-w-[392px] flex-col justify-center px-[41px] py-10">
        <form
          onSubmit={handleSubmit}
          className="flex w-full flex-col items-center gap-[61px]"
        >
          <Image
            src="/assets/login/logo.svg"
            alt="Smartfish"
            width={64}
            height={64}
            priority
            className="h-16 w-16"
          />

          <div className="flex w-full flex-col gap-6">
            <div className="text-[17px] leading-[22px] font-[590] tracking-[-0.43px] text-[#121212]">
              Войдите в аккаунт
            </div>

            <div className="flex w-full flex-col gap-3">
              <LoginField
                label="Имя или почта"
                inputMode="email"
                name="login"
                value={form.login}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    login: event.target.value,
                  }))
                }
                placeholder="Имя или почта"
                autoComplete="username"
                disabled={loading}
              />

              <LoginField
                label="Пароль"
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                placeholder="Пароль"
                autoComplete="current-password"
                disabled={loading}
                trailingIcon={
                  <button
                    type="button"
                    aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((current) => !current)}
                    disabled={loading}
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-transform transition-opacity duration-200 ease-out hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <PasswordEyeIcon visible={showPassword} />
                  </button>
                }
              />

              {error ? (
                <div className="px-1 text-[13px] leading-[18px] text-[#d14343]">
                  {error}
                </div>
              ) : null}

              {notice ? (
                <div className="px-1 text-[13px] leading-[18px] text-[#3b82f6]">
                  {notice}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="flex h-[50px] w-full items-center justify-center rounded-full bg-[#3B82F6] px-5 text-[17px] leading-[22px] font-[590] tracking-[-0.43px] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Входим..." : "Войти"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function LoginField({
  label,
  trailingIcon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  trailingIcon?: React.ReactNode;
}) {
  return (
    <label className="relative flex w-full items-center">
      <span className="sr-only">{label}</span>
      <input
        {...props}
        className={[
          "h-[50px] w-full rounded-full border-0 bg-[#ECECEC] px-5 text-[17px] leading-[22px] tracking-[-0.43px] text-[#121212] outline-none",
          "placeholder:text-[#121212] disabled:cursor-not-allowed disabled:opacity-70",
          trailingIcon ? "pr-[54px]" : "",
        ].join(" ")}
      />
      {trailingIcon ? (
        <span className="absolute right-5 top-1/2 flex -translate-y-1/2 items-center justify-center">
          {trailingIcon}
        </span>
      ) : null}
    </label>
  );
}

function PasswordEyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="h-[22px] w-[22px]"
      >
        <path
          d="M2.75 11C4.28 7.28 7.21 5.42 11 5.42C14.79 5.42 17.72 7.28 19.25 11C17.72 14.72 14.79 16.58 11 16.58C7.21 16.58 4.28 14.72 2.75 11Z"
          stroke="#949494"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="11" cy="11" r="2.75" stroke="#949494" strokeWidth="1.5" />
      </svg>
    );
  }

  return (
    <Image
      src="/assets/login/eye-closed.svg"
      alt=""
      width={22}
      height={22}
      aria-hidden="true"
      className="h-[22px] w-[22px]"
    />
  );
}
