export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api/v1"
).replace(/\/$/, "");
export async function request<T>(
  path: string,
  method = "GET",
  _body?: unknown,
  _auth = false,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(API_URL + path, {
      method,
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error?.message ?? "Máy chủ trả về lỗi.");
    return data;
  } catch (error) {
    if (error instanceof Error && error.message.includes("database"))
      throw error;
    throw new Error(
      "Chưa kết nối được API. Kiểm tra IP LAN, Wi-Fi và backend đang chạy.",
    );
  } finally {
    clearTimeout(timer);
  }
}
