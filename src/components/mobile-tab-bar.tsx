"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { appRoutes } from "@/lib/app-routes";
import styles from "./mobile-tab-bar.module.css";

export type MobileTabId = "home" | "cart" | "profile";

const tabs = [
  {
    id: "home",
    href: appRoutes.home,
    label: "Главная",
    activeIcon: "/assets/figma/navbar/navbar-home.svg",
    inactiveIcon: "/assets/figma/navbar/navbar-home-inactive.svg",
  },
  {
    id: "cart",
    href: appRoutes.cart,
    label: "Корзина",
    activeIcon: "/assets/figma/navbar/navbar-cart-active.svg",
    inactiveIcon: "/assets/figma/navbar/navbar-cart.svg",
  },
  {
    id: "profile",
    href: appRoutes.account,
    label: "Профиль",
    activeIcon: "/assets/figma/navbar/navbar-profile-active.svg",
    inactiveIcon: "/assets/figma/navbar/navbar-profile.svg",
  },
] satisfies ReadonlyArray<{
  id: MobileTabId;
  href: string;
  label: string;
  activeIcon: string;
  inactiveIcon: string;
}>;

type IndicatorStyle = CSSProperties & {
  "--indicator-left": string;
  "--indicator-width": string;
};

function resolveActiveTab(pathname: string): MobileTabId {
  if (pathname.startsWith(appRoutes.cart)) {
    return "cart";
  }

  if (pathname.startsWith(appRoutes.account) || pathname.startsWith(appRoutes.orders)) {
    return "profile";
  }

  return "home";
}

export function getIndicatorStyle({
  activeTabIndex,
  indicatorRect,
  hasMeasured,
  tabCount,
}: {
  activeTabIndex: number;
  indicatorRect: {
    left: number;
    width: number;
  };
  hasMeasured: boolean;
  tabCount: number;
}): IndicatorStyle {
  const fallbackStep = 100 / tabCount;

  return {
    "--indicator-left": hasMeasured
      ? `${indicatorRect.left}px`
      : `${activeTabIndex * fallbackStep}%`,
    "--indicator-width": hasMeasured
      ? `${indicatorRect.width}px`
      : `${fallbackStep}%`,
  };
}

export function MobileTabBar() {
  const pathname = usePathname();
  const activeTab = resolveActiveTab(pathname);
  const activeTabIndex = Math.max(0, tabs.findIndex((tab) => tab.id === activeTab));
  const [indicatorRect, setIndicatorRect] = useState({ left: 0, width: 0 });
  const [ready, setReady] = useState(false);
  const hasMeasuredRef = useRef(false);
  const itemsRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<MobileTabId, HTMLAnchorElement | null>>({
    home: null,
    cart: null,
    profile: null,
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setReady(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    function updateIndicator() {
      const activeEl = tabRefs.current[activeTab];
      const containerEl = itemsRef.current;

      if (!activeEl || !containerEl) {
        return;
      }

      const activeRect = activeEl.getBoundingClientRect();
      const containerRect = containerEl.getBoundingClientRect();

      setIndicatorRect({
        left: activeRect.left - containerRect.left,
        width: activeRect.width,
      });
      hasMeasuredRef.current = true;
    }

    updateIndicator();
    window.addEventListener("resize", updateIndicator);

    return () => {
      window.removeEventListener("resize", updateIndicator);
    };
  }, [activeTab]);

  const indicatorStyle = getIndicatorStyle({
    activeTabIndex,
    indicatorRect,
    hasMeasured: hasMeasuredRef.current,
    tabCount: tabs.length,
  });

  return (
    <nav aria-label="Основная навигация" className={styles.shell} data-ready={ready}>
      <div className={styles.tabs}>
        <div className={styles.background} aria-hidden="true">
          <div className={styles.glass} />
        </div>

        <div
          aria-hidden="true"
          className={styles.indicator}
          style={indicatorStyle}
        />

        <div className={styles.items} ref={itemsRef}>
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={styles.tab}
                data-active={isActive}
                ref={(node) => {
                  tabRefs.current[tab.id] = node;
                }}
              >
                <span className={styles.tabInner}>
                  <Image
                    src={isActive ? tab.activeIcon : tab.inactiveIcon}
                    alt=""
                    aria-hidden="true"
                    width={28}
                    height={28}
                    className={styles.icon}
                  />
                  <span className={styles.label}>{tab.label}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
