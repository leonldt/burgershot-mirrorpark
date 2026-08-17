/** Session/Cookie & Konfigurations-Konstanten (edge-sicher, ohne Seiteneffekte). */
export const SESSION_COOKIE = "bs_session";
export const SESSION_TTL_HOURS = Number(process.env.AUTH_SESSION_TTL_HOURS ?? 12);
export const SESSION_TTL = SESSION_TTL_HOURS * 3_600_000;
export const ORDER_NUMBER_OFFSET = 1000;
export const FORMATTED_ORDER_NUMBER = (number: number) => `#${ORDER_NUMBER_OFFSET + number}`;