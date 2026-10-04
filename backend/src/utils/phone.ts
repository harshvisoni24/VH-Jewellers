/** Indian mobile numbers are stored as 10 digits (no +91, spaces or dashes). */
export const normalizePhone = (p: string) => p.replace(/\D/g, "").slice(-10);
export const isValidMobile = (p: string) => /^[6-9]\d{9}$/.test(p);
