// Shared primitive validation before any string operations or database queries.
export function validFields(body: unknown, strings: Record<string, number>, booleans: string[] = []): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const values = body as Record<string, unknown>;
  return Object.entries(strings).every(([key, max]) => values[key] === undefined ||
    (typeof values[key] === "string" && values[key].length <= max)) &&
    booleans.every((key) => values[key] === undefined || typeof values[key] === "boolean");
}

export function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
