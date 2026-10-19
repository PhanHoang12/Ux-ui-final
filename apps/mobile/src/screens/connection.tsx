import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import {
  Screen,
  Heading,
  T,
  Button,
  Notice,
  LinkText,
  color,
  s,
} from "../components/ui";
import { API_URL, request } from "../lib/api";
interface Health {
  status: "ok";
  service: string;
  database: "connected";
  checkedAt: string;
}
export function Connection() {
  const [result, setResult] = useState<Health | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function check() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const data = await request<Health>("/health", "GET", undefined, false);
      if (data.status !== "ok" || data.database !== "connected")
        throw new Error(
          "Phản hồi máy chủ chưa đúng hợp đồng kiểm tra kết nối.",
        );
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <LinkText
        title="Về bộ giao diện"
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/ui")
        }
      />
      <T style={{ color: color.primary }}>GREENSTEPS · KẾT NỐI</T>
      <Heading
        title="Kiểm tra kết nối"
        description="Xác nhận ứng dụng truy cập được API và database trước khi làm chức năng tài khoản."
      />
      <View style={s.card}>
        <T>Địa chỉ API</T>
        <T selectable style={{ fontSize: 12, color: color.muted }}>
          {API_URL}
        </T>
      </View>
      <Notice message={error} />
      {result && (
        <Notice success message="Kết nối API và database thành công." />
      )}
      <View style={s.card}>
        <T>
          Expo → API:{" "}
          {result ? "Đã kết nối" : busy ? "Đang kiểm tra…" : "Chưa xác nhận"}
        </T>
        <T>API → Database: {result ? "Đã kết nối" : "Chưa xác nhận"}</T>
        {result && (
          <T style={{ fontSize: 12, color: color.muted }}>
            Kiểm tra lúc {new Date(result.checkedAt).toLocaleString("vi-VN")}
          </T>
        )}
      </View>
      <Button
        title="Kiểm tra kết nối"
        loading={busy}
        onPress={() => void check()}
      />
      <T style={{ fontSize: 12, color: color.muted }}>
        Trên điện thoại, địa chỉ API phải là IP LAN của máy chạy backend hoặc
        địa chỉ HTTPS có thể truy cập được.
      </T>
    </Screen>
  );
}
