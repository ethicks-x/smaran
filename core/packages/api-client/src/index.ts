import createClient, { type ClientOptions } from "openapi-fetch";
import type { paths } from "./api-types";

export const createApiClient = (options?: ClientOptions) => {
  return createClient<paths>({
    baseUrl: options?.baseUrl || "http://localhost:8000",
    ...options,
  });
};

// Default singleton client instance for local dev
export const apiClient = createApiClient();

// Re-export backend types for frontend components
export type * from "./api-types";
export type Item = paths["/items"]["get"]["responses"][200]["content"]["application/json"][number];
export type ItemCreateInput = paths["/items"]["post"]["requestBody"]["content"]["application/json"];
