import { API_BASE_URL, apiGet, apiPost, setAuthToken } from "@shared/services/apiClient";
import { localStore } from "@shared/services/localStore";
import type { AuthSession, LoginPayload, OAuthProvider, RegisterPayload } from "@shared/types";

interface OAuthInitResponse {
  redirectUrl?: string;
  url?: string;
  accessToken?: string;
  tokenType?: "Bearer";
  user?: AuthSession["user"];
}

export async function login(payload: LoginPayload): Promise<AuthSession> {
  const session = await apiPost<AuthSession>("/auth/login", payload);
  setAuthToken(session.accessToken);
  localStore.setUser(session.user);
  return session;
}

export async function register(payload: RegisterPayload): Promise<AuthSession> {
  const session = await apiPost<AuthSession>("/auth/register", payload);
  setAuthToken(session.accessToken);
  localStore.setUser(session.user);
  return session;
}

export async function startOAuth(provider: OAuthProvider): Promise<{ redirected: boolean; session?: AuthSession }> {
  const response = await apiGet<OAuthInitResponse>(`/auth/oauth/${provider}`);
  if (response.accessToken && response.user) {
    const session: AuthSession = {
      accessToken: response.accessToken,
      tokenType: response.tokenType ?? "Bearer",
      user: response.user,
    };
    setAuthToken(session.accessToken);
    localStore.setUser(session.user);
    return { redirected: false, session };
  }

  const targetUrl = response.redirectUrl ?? response.url ?? `${API_BASE_URL}/auth/oauth/${provider}`;
  window.location.assign(targetUrl);
  return { redirected: true };
}

export async function requestPasswordReset(email: string): Promise<{ message?: string }> {
  return apiPost<{ message?: string }>("/auth/forgot-password", { email });
}

export function logout(): void {
  setAuthToken(null);
  localStore.setUser(null);
}

export const authService = {
  login,
  register,
  startOAuth,
  requestPasswordReset,
  logout,
};
