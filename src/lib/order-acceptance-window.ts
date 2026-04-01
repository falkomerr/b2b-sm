export const ORDER_ACCEPTANCE_TIMEZONE = "Asia/Bishkek";
export const ORDER_ACCEPTANCE_WINDOW_LABEL = "06:00-00:00";
export const ORDER_ACCEPTANCE_CLOSED_MESSAGE =
  "Заказы принимаются с 06:00 до 00:00 по времени Бишкека.";

const ORDER_ACCEPTANCE_START_MINUTES = 6 * 60;
const ORDER_ACCEPTANCE_END_MINUTES = 24 * 60;

function getMinutesInBishkek(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: ORDER_ACCEPTANCE_TIMEZONE,
  });
  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  return hour * 60 + minute;
}

export function isOrderAcceptanceOpen(date = new Date()) {
  const minutes = getMinutesInBishkek(date);
  return minutes >= ORDER_ACCEPTANCE_START_MINUTES && minutes < ORDER_ACCEPTANCE_END_MINUTES;
}
