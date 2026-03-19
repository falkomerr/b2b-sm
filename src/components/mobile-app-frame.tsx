import type { ReactNode } from "react";
import { MobileTabBar } from "@/components/mobile-tab-bar";

export const mobileAppFontFamily =
  'SF Pro Text, SF Pro Display, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

type MobileAppFrameProps = {
  children: ReactNode;
  footer?: ReactNode;
  mainClassName?: string;
  showTabBar?: boolean;
  tabBarFixed?: boolean;
};

export function MobileAppFrame({
  children,
  footer,
  mainClassName = "",
  showTabBar = true,
  tabBarFixed = false,
}: MobileAppFrameProps) {
  const hasFixedFooter = Boolean(footer);
  const hasFixedTabBar = Boolean(showTabBar && tabBarFixed);
  const fixedBottomPadding = hasFixedFooter
    ? hasFixedTabBar
      ? "pb-[204px]"
      : "pb-[144px]"
    : hasFixedTabBar
      ? "pb-[88px]"
      : "";
  const fixedTabBarBottom = hasFixedFooter ? "bottom-[132px]" : "bottom-0";

  return (
    <div className="min-h-screen bg-[#f4f5f7]" style={{ fontFamily: mobileAppFontFamily }}>
      <div className="mx-auto flex min-h-screen w-full max-w-[392px] flex-col bg-white sm:my-5 sm:min-h-[852px] sm:overflow-hidden sm:rounded-[44px] sm:shadow-[0_28px_90px_rgba(18,18,18,0.14)]">
        <main
          className={[
            "flex-1 min-h-0 overflow-y-auto pt-10",
            fixedBottomPadding,
            mainClassName,
          ].join(" ").trim()}
        >
          {children}
        </main>
        {hasFixedFooter ? (
          <div className="fixed inset-x-0 bottom-0 z-30 flex w-full flex-col items-center">
            <div className="w-full max-w-[392px]">{footer}</div>
          </div>
        ) : null}
        {showTabBar ? (
          tabBarFixed ? (
            <div
              className={[
                "fixed inset-x-0 z-30 flex w-full flex-col items-center pb-2 pt-3",
                fixedTabBarBottom,
              ].join(" ")}
            >
              <div className="w-full max-w-[392px]">
                <MobileTabBar />
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-center pb-0 pt-3">
                <MobileTabBar />
              </div>
            </>
          )
        ) : null}
      </div>
    </div>
  );
}
