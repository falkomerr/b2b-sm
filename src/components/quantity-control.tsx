"use client";

import { useEffect, useState } from "react";
import {
  formatQuantityValue,
  isManualQuantityInputEnabled,
  parseQuantityInput,
  type ProductUnit,
} from "@/lib/product-units";

export function QuantityControl({
  disabled = false,
  incrementDisabled = false,
  onChange,
  onDecrement,
  onIncrement,
  quantity,
  unit,
}: {
  disabled?: boolean;
  incrementDisabled?: boolean;
  onChange?: (quantity: number) => void;
  onDecrement: () => void;
  onIncrement: () => void;
  quantity: number;
  unit: ProductUnit;
}) {
  const [inputValue, setInputValue] = useState(formatQuantityValue(quantity, unit));

  useEffect(() => {
    setInputValue(formatQuantityValue(quantity, unit));
  }, [quantity, unit]);

  const quantityValue = formatQuantityValue(quantity, unit);

  return (
    <div className="flex max-w-full flex-wrap items-center gap-2">
      <div className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#f4f5f7] px-2 py-1">
        <button
          type="button"
          onClick={onDecrement}
          disabled={disabled}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[16px] leading-none text-[#121212] shadow-[0_4px_10px_rgba(15,23,42,0.08)] disabled:text-[#c6c7cf]"
        >
          -
        </button>
        <span className="min-w-[28px] text-center text-[14px] leading-[17px] font-semibold tracking-[-0.15px] text-[#121212]">
          {quantityValue}
        </span>
        <button
          type="button"
          onClick={onIncrement}
          disabled={disabled || incrementDisabled}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1688ff] text-[16px] leading-none text-white disabled:bg-[#cfe4fb]"
        >
          +
        </button>
      </div>

      {isManualQuantityInputEnabled(unit) ? (
        <label className="flex h-8 min-w-0 items-center gap-1.5 rounded-full border border-[#dfe3eb] bg-white px-2.5 sm:px-3">
          <input
            type="text"
            inputMode="decimal"
            value={inputValue}
            onChange={(event) => {
              const nextValue = event.target.value;
              setInputValue(nextValue);

              const parsed = parseQuantityInput(nextValue, unit);
              if (parsed !== null) {
                onChange?.(parsed);
              }
            }}
            onBlur={() => {
              const parsed = parseQuantityInput(inputValue, unit);

              if (parsed === null) {
                setInputValue(quantityValue);
                return;
              }

              onChange?.(parsed);
              setInputValue(formatQuantityValue(parsed, unit));
            }}
            className="w-12 min-w-0 border-none bg-transparent text-right text-[13px] font-semibold text-[#121212] outline-none sm:w-14"
          />
          <span className="shrink-0 text-[12px] leading-4 text-[#8e8e93]">кг</span>
        </label>
      ) : null}
    </div>
  );
}
