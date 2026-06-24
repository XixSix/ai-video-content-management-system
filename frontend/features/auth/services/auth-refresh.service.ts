import { publicApiClient, unwrapApiResponse } from "@/lib/api/api-client";
import type { ApiSuccess } from "@/lib/api/api.types";
import type { AccessTokenResponseData } from "../types/auth.types";

let refreshRequest: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  if (!refreshRequest) {
    refreshRequest = unwrapApiResponse(
      publicApiClient.post<ApiSuccess<AccessTokenResponseData>>(
        "/auth/refresh",
      ),
    )
      .then(({ accessToken }) => accessToken)
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
}
