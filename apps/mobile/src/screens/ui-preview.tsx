import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import {
  Art,
  Badge,
  Button,
  Card,
  Check,
  EmptyState,
  Field,
  LoadingState,
  Notice,
  OTPInput,
  Screen,
  T,
  color,
} from "../components/ui";
import { art } from "../lib/art";
import { radius, space } from "../theme/tokens";

type Tab = "components" | "form";
function SectionTitle({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description?: string;
}) {
  return (
    <View style={{ gap: space.xs }}>
      <T variant="caption" style={{ color: color.primary, letterSpacing: 1.3 }}>
        {number}
      </T>
      <T accessibilityRole="header" variant="title">
        {title}
      </T>
      {!!description && <T style={{ color: color.muted }}>{description}</T>}
    </View>
  );
}

function ComponentsPreview() {
  const [message, setMessage] = useState<string | null>(null);
  const [state, setState] = useState<"empty" | "loading" | "error">("empty");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const retry = () => {
    setState("loading");
    timer.current = setTimeout(() => {
      setState("empty");
    }, 800);
  };
  return (
    <>
      <SectionTitle
        number="01 / NHẬN DIỆN"
        title="Xanh trong từng chi tiết"
        description="Bảng màu nhẹ nhàng và kiểu chữ dễ đọc, thống nhất với thiết kế GreenSteps."
      />
      <Card>
        <View style={styles.swatches}>
          {(
            [
              ["Xanh chủ đạo", color.primary],
              ["Nền dịu", color.bg],
              ["Chữ chính", color.text],
              ["Đường viền", color.line],
            ] as const
          ).map(([label, value]) => (
            <View key={label} style={styles.swatchItem}>
              <View style={[styles.swatch, { backgroundColor: value }]} />
              <T variant="label">{label}</T>
              <T variant="caption" style={{ color: color.muted }}>
                {value}
              </T>
            </View>
          ))}
        </View>
        <View style={styles.divider} />
        <T variant="title">Montserrat</T>
        <T>Mỗi bước nhỏ đều tạo nên thay đổi.</T>
        <T variant="caption" style={{ color: color.muted }}>
          Tiêu đề rõ ràng · Nhãn ngắn gọn · Nội dung dễ đọc
        </T>
      </Card>
      <SectionTitle
        number="02 / HÀNH ĐỘNG"
        title="Nút bấm có phản hồi"
        description="Thử chạm vào các nút để xem phản hồi."
      />
      <Card>
        <Button
          title="Tiếp tục"
          onPress={() => setMessage("Bạn vừa chọn nút chính — Tiếp tục.")}
        />
        <Button
          title="Lựa chọn khác"
          variant="secondary"
          onPress={() => setMessage("Bạn vừa chọn nút phụ — Lựa chọn khác.")}
        />
        <Button
          title="Để sau"
          variant="ghost"
          onPress={() => setMessage("Bạn vừa chọn liên kết — Để sau.")}
        />
        <View style={styles.divider} />
        <T variant="caption" style={{ color: color.muted }}>
          Đang xử lý và chưa khả dụng
        </T>
        <Button title="Lưu" loading />
        <Button title="Chưa khả dụng" disabled />
        <Notice variant="info" message={message} />
      </Card>
      <SectionTitle
        number="03 / PHẢN HỒI"
        title="Luôn biết điều gì đang xảy ra"
      />
      <View style={{ gap: space.md }}>
        <Notice
          variant="info"
          message="Bạn có thể thay đổi lựa chọn này bất cứ lúc nào."
        />
        <Notice success message="Đã lưu lựa chọn của bạn thành công." />
        <Notice message="Chưa thể lưu thay đổi. Vui lòng thử lại." />
      </View>
      <Card>
        <View style={styles.stateTabs}>
          {(
            [
              ["empty", "Trống"],
              ["loading", "Đang tải"],
              ["error", "Lỗi"],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`Xem trạng thái ${label.toLowerCase()}`}
              accessibilityState={{ selected: key === state }}
              onPress={() => {
                if (timer.current) clearTimeout(timer.current);
                setState(key);
              }}
              style={[
                styles.stateTab,
                key === state && { backgroundColor: color.soft },
              ]}
            >
              <T
                variant="caption"
                style={{ color: key === state ? color.primary : color.muted }}
              >
                {label}
              </T>
            </Pressable>
          ))}
        </View>
        {state === "empty" && (
          <EmptyState
            title="Mọi hành trình đều có khởi đầu"
            description="Nội dung bạn lưu sẽ xuất hiện tại đây."
          />
        )}
        {state === "loading" && <LoadingState />}
        {state === "error" && (
          <View style={{ gap: space.md }}>
            <Notice message="Không tải được nội dung. Hãy kiểm tra kết nối và thử lại." />
            <Button title="Thử lại" variant="secondary" onPress={retry} />
          </View>
        )}
      </Card>
    </>
  );
}

function FormPreview() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true),
    [otp, setOtp] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [busy, setBusy] = useState(false),
    [success, setSuccess] = useState(false),
    [otpChecked, setOtpChecked] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const submit = () => {
    if (busy) return;
    const next = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ? undefined
        : "Nhập địa chỉ email hợp lệ, ví dụ ban@example.com.",
      password:
        password.length >= 8 ? undefined : "Mật khẩu cần có ít nhất 8 ký tự.",
    };
    setErrors(next);
    setSuccess(false);
    if (next.email || next.password) return;
    setBusy(true);
    timer.current = setTimeout(() => {
      setBusy(false);
      setSuccess(true);
    }, 800);
  };
  return (
    <>
      <SectionTitle
        number="01 / BIỂU MẪU"
        title="Nhập liệu thật thoải mái"
        description="Chạm vào ô nhập, thử hiện mật khẩu và gửi biểu mẫu trống để xem cách báo lỗi."
      />
      <Card>
        <Field
          label="Email"
          placeholder="ban@example.com"
          keyboardType="email-address"
          autoComplete="email"
          autoCorrect={false}
          value={email}
          disabled={busy}
          error={errors.email}
          hint="Dùng email của bạn để tiếp tục."
          onChangeText={(value) => {
            setEmail(value);
            setErrors((old) => ({ ...old, email: undefined }));
            setSuccess(false);
          }}
        />
        <Field
          label="Mật khẩu"
          password
          autoComplete="new-password"
          placeholder="Ít nhất 8 ký tự"
          value={password}
          disabled={busy}
          error={errors.password}
          onChangeText={(value) => {
            setPassword(value);
            setErrors((old) => ({ ...old, password: undefined }));
            setSuccess(false);
          }}
        />
        <Check
          label="Ghi nhớ lựa chọn của tôi"
          value={remember}
          onChange={setRemember}
          disabled={busy}
        />
        <Button title="Kiểm tra biểu mẫu" loading={busy} onPress={submit} />
        <Notice
          success
          message={
            success
              ? "Biểu mẫu hợp lệ. Đây là bản xem thử, chưa tạo tài khoản."
              : null
          }
        />
        <T variant="caption" style={{ color: color.muted }}>
          Thông tin nhập ở đây chỉ phục vụ xem thử giao diện.
        </T>
      </Card>
      <SectionTitle
        number="02 / XÁC THỰC"
        title="Sáu chữ số, một thao tác"
        description="Có thể nhập, dán hoặc xóa cả mã trong cùng một ô."
      />
      <Card>
        <OTPInput
          value={otp}
          onChange={(value) => {
            setOtp(value);
            setOtpChecked(false);
          }}
          error={
            otpChecked && otp.length !== 6
              ? "Vui lòng nhập đủ 6 chữ số."
              : undefined
          }
        />
        <Button
          title="Kiểm tra mã mẫu"
          variant="secondary"
          onPress={() => setOtpChecked(true)}
        />
        <Notice
          success
          message={
            otpChecked && otp.length === 6
              ? "Bạn đã nhập đủ 6 chữ số. Chưa thực hiện xác thực qua máy chủ."
              : null
          }
        />
      </Card>
      <SectionTitle
        number="03 / TRẠNG THÁI Ô NHẬP"
        title="Rõ ràng ở mọi trạng thái"
      />
      <Card>
        <Field
          label="Thông tin chỉ đọc"
          value="GreenSteps"
          editable={false}
          hint="Ô không cho phép chỉnh sửa."
        />
        <Field
          label="Ví dụ thông báo lỗi"
          value="email-chua-dung"
          editable={false}
          error="Địa chỉ email chưa đúng định dạng."
        />
      </Card>
    </>
  );
}

export function UIPreview() {
  const [tab, setTab] = useState<Tab>("form");
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 380 || fontScale > 1.2;
  return (
    <Screen>
      <View style={styles.brandRow}>
        <View style={styles.brand}>
          <Art source={art.leaf} width={28} />
          <T variant="title" style={{ fontSize: 20 }}>
            GreenSteps
          </T>
        </View>
        <Badge label="UI · 04" />
      </View>
      <View
        style={[
          styles.hero,
          compact && { flexDirection: "column", alignItems: "flex-start" },
        ]}
      >
        <View style={{ flex: compact ? undefined : 1, gap: space.sm }}>
          <T
            variant="caption"
            style={{ color: color.white, letterSpacing: 1.2 }}
          >
            MỖI NGÀY MỘT CHÚT
          </T>
          <T
            accessibilityRole="header"
            variant="display"
            style={{ color: color.white, fontSize: 25, lineHeight: 36 }}
          >
            Gieo những{"\n"}bước xanh.
          </T>
          <T variant="caption" style={{ color: color.white }}>
            Bắt đầu từ điều nhỏ nhất.
          </T>
        </View>
        <View style={compact ? { alignSelf: "center" } : undefined}>
          <Art source={art.sprout} width={150} />
        </View>
      </View>
      <View style={{ gap: space.sm }}>
        <T accessibilityRole="header" variant="title">
          Bộ giao diện GreenSteps
        </T>
        <T style={{ color: color.muted }}>
          Bản xem thử các thành phần trước khi hoàn thiện luồng tài khoản.
        </T>
      </View>
      <View accessibilityRole="tablist" style={styles.tabs}>
        {(
          [
            ["form", "Biểu mẫu"],
            ["components", "Thành phần"],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === key }}
            onPress={() => setTab(key)}
            style={[styles.tab, tab === key && styles.activeTab]}
          >
            <T
              variant="label"
              style={{
                color: tab === key ? color.primary : color.muted,
                textAlign: "center",
              }}
            >
              {label}
            </T>
          </Pressable>
        ))}
      </View>
      {tab === "form" ? <FormPreview /> : <ComponentsPreview />}
      <View style={styles.footer}>
        <Button
          title="Kiểm tra kết nối API"
          variant="secondary"
          onPress={() => router.push("/connection")}
        />
        <T
          variant="caption"
          style={{ color: color.muted, textAlign: "center" }}
        >
          GreenSteps · Bộ UI dùng chung · Task 4
        </T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    flexWrap: "wrap",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: space.sm },
  hero: {
    backgroundColor: color.primary,
    borderRadius: radius.hero,
    padding: space.xl,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    minHeight: 206,
    gap: space.sm,
  },
  tabs: {
    backgroundColor: color.soft,
    borderRadius: radius.button,
    padding: space.xs,
    flexDirection: "row",
    gap: space.xs,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    padding: space.md,
    justifyContent: "center",
    borderRadius: 14,
  },
  activeTab: { backgroundColor: color.white },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: space.lg },
  swatchItem: { width: "45%", flexGrow: 1, gap: space.xs },
  swatch: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: color.line,
    marginBottom: space.xs,
  },
  divider: { height: 1, backgroundColor: color.line, marginVertical: space.xs },
  stateTabs: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  stateTab: {
    minHeight: 44,
    flexGrow: 1,
    padding: space.md,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: { paddingTop: space.sm, gap: space.lg },
});
