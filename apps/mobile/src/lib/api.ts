export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api/v1"
).replace(/\/$/, "");
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code = "REQUEST_FAILED",
    public fields?: Record<string, string>,
    public retryAfterSeconds?: number,
  ) {
    super(message);
  }
}
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  token: string | false = false,
): Promise<T> {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(API_URL + path, {
      method,
      signal: controller.signal,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new ApiError(
        "Máy chủ trả về phản hồi chưa hợp lệ.",
        response.status,
        "INVALID_RESPONSE",
      );
    }
    if (!response.ok)
      throw new ApiError(
        data.error?.message ?? "Không thể xử lý yêu cầu.",
        response.status,
        data.error?.code,
        data.error?.fields,
        data.error?.retryAfterSeconds,
      );
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "Chưa kết nối được API. Kiểm tra Wi-Fi, IP LAN và máy chủ rồi thử lại.",
      0,
      "NETWORK_ERROR",
    );
  } finally {
    clearTimeout(timer);
  }
}
