const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/** Clears a stale session cookie, then navigates to login. */
export async function redirectToLogin() {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Best-effort cookie clear before redirect.
  }
  window.location.href = "/login";
}

export function isUnauthenticatedResponse(status: number, user: unknown) {
  return status === 401 || !user;
}
