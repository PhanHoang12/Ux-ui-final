import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Clipboard from "expo-clipboard";
import {
  Art,
  Button,
  Check,
  Field,
  Heading,
  LinkText,
  LoadingState,
  Notice,
  OTPInput,
  Screen,
  T,
  color,
  font,
} from "../components/ui";
import { art } from "../lib/art";
import { ApiError, request } from "../lib/api";
import { useAction } from "../lib/use-action";
import { useSession, type Challenge } from "../lib/session";

export function Nav({
  title,
  onBack = () => router.replace("/auth/login"),
}: {
  title: string;
  onBack?: () => void;
}) {
  return (
    <View style={styles.nav}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        onPress={onBack}
        style={styles.back}
      >
        <Art source={art.back} width={24} />
      </Pressable>
      <T
        variant="caption"
        style={{ color: color.muted, textAlign: "right", flex: 1 }}
      >
        {title}
      </T>
    </View>
  );
}
export function Login() {
  const session = useSession(),
    a = useAction(),
    insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ verified?: string }>();
  const [email, setEmail] = useState(session.emailHint),
    [password, setPassword] = useState(""),
    [remember, setRemember] = useState(true),
    [info, setInfo] = useState<string | null>(null);
  const { width, fontScale } = useWindowDimensions(),
    compact = width < 380 || fontScale > 1.2;
  if (session.loading)
    return (
      <Screen>
        <LoadingState label="Đang khôi phục phiên…" />
      </Screen>
    );
  if (session.user) return <Redirect href="/home" />;
  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, alignItems: "center" }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 480,
              flex: 1,
              backgroundColor: color.white,
            }}
          >
            <View
              style={[
                styles.loginHero,
                { paddingTop: insets.top + 30 },
                compact ? { paddingBottom: 44 } : { height: 276 + insets.top },
              ]}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Art source={art.leaf} width={28} />
                <T variant="title" style={{ color: color.white, fontSize: 20 }}>
                  GreenSteps
                </T>
              </View>
              <View
                style={{
                  marginTop: 30,
                  gap: 10,
                  maxWidth: compact ? "100%" : 260,
                }}
              >
                <T
                  accessibilityRole="header"
                  variant="display"
                  style={{ color: color.white }}
                >
                  Chào bạn,{"\n"}mừng trở lại!
                </T>
                <T style={{ color: color.white, fontSize: 13, lineHeight: 18 }}>
                  Tiếp tục những bước nhỏ{"\n"}vì một hành tinh xanh.
                </T>
              </View>
              <View
                style={
                  compact
                    ? { alignSelf: "center", marginTop: 16 }
                    : { position: "absolute", right: 10, top: insets.top + 76 }
                }
              >
                <Art source={art.sprout} width={150} />
              </View>
            </View>
            <View
              style={[styles.loginForm, { paddingBottom: insets.bottom + 24 }]}
            >
              <Notice
                success
                message={
                  params.verified === "1"
                    ? "Email đã xác thực. Bạn có thể đăng nhập rồi nhé!"
                    : null
                }
              />
              <Notice message={a.error} />
              <Notice variant="info" message={info} />
              <Field
                label="Email"
                placeholder="ban@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="email"
                autoCorrect={false}
                error={a.fields.email}
                disabled={a.busy}
              />
              <Field
                label="Mật khẩu"
                password
                value={password}
                onChangeText={setPassword}
                autoComplete="current-password"
                maxLength={128}
                error={a.fields.password}
                disabled={a.busy}
              />
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <View style={{ flexGrow: 1 }}>
                  <Check
                    label="Ghi nhớ tôi"
                    value={remember}
                    onChange={setRemember}
                    disabled={a.busy}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    setInfo(
                      "Tính năng quên mật khẩu sẽ có trong bản cập nhật tiếp theo.",
                    )
                  }
                  style={{ minHeight: 48, justifyContent: "center" }}
                >
                  <T variant="label" style={{ color: color.primary }}>
                    Quên mật khẩu?
                  </T>
                </Pressable>
              </View>
              {Platform.OS === "web" && (
                <T variant="caption" style={{ color: color.muted }}>
                  Trên bản web, phiên chỉ được giữ khi trang còn mở.
                </T>
              )}
              <Button
                title="Đăng nhập"
                loading={a.busy}
                onPress={() =>
                  void a.run(async () => {
                    const result = await session.signIn(
                      email,
                      password,
                      remember,
                    );
                    setPassword("");
                    router.replace(
                      "verificationRequired" in result ? "/auth/otp" : "/home",
                    );
                  })
                }
              />
              <View style={styles.dividerRow}>
                <View style={styles.line} />
                <T variant="caption" style={{ color: color.muted }}>
                  hoặc tiếp tục với
                </T>
                <View style={styles.line} />
              </View>
              <View style={{ flexDirection: "row", gap: 14 }}>
                {(
                  [
                    ["Google", art.google],
                    ["Facebook", art.facebook],
                  ] as const
                ).map(([name, source]) => (
                  <Pressable
                    key={name}
                    accessibilityRole="button"
                    accessibilityLabel={`${name}, sắp ra mắt`}
                    accessibilityState={{ disabled: true }}
                    disabled
                    style={styles.social}
                  >
                    <Art source={source} width={22} />
                    <T variant="label">{name}</T>
                  </Pressable>
                ))}
              </View>
              <T
                variant="caption"
                style={{ textAlign: "center", color: color.muted }}
              >
                Đăng nhập mạng xã hội sắp ra mắt.
              </T>
              <LinkText
                title="Chưa có tài khoản? Đăng ký ngay"
                onPress={() => router.push("/auth/register")}
              />
              <View style={styles.security}>
                <Art source={art.shield} width={18} />
                <T variant="caption" style={{ color: color.muted }}>
                  Thông tin của bạn được bảo vệ
                </T>
              </View>
              <LinkText
                title="Xem bộ giao diện"
                onPress={() => router.push("/ui")}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
export function Register() {
  const session = useSession(),
    a = useAction();
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [consent, setConsent] = useState(false),
    [privacy, setPrivacy] = useState(false);
  if (session.user) return <Redirect href="/home" />;
  return (
    <Screen>
      <StatusBar style="dark" />
      <Nav title="TẠO TÀI KHOẢN" />
      <View
        style={{
          flexDirection: "row",
          gap: 12,
          alignItems: "flex-start",
          marginTop: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Heading title={"Bắt đầu cùng\nGreenSteps."} />
        </View>
        <Art source={art.register_leaf} width={54} />
      </View>
      <T style={{ fontSize: 15, lineHeight: 24, color: color.muted }}>
        Lưu hành trình sống xanh và nhận những gợi ý dành riêng cho bạn.
      </T>
      <Notice message={a.error} />
      <View style={{ gap: 16 }}>
        <Field
          label="Họ và tên"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete="name"
          maxLength={100}
          error={a.fields.displayName}
          disabled={a.busy}
        />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          autoCorrect={false}
          error={a.fields.email}
          disabled={a.busy}
        />
        <Field
          label="Mật khẩu"
          password
          value={password}
          onChangeText={setPassword}
          autoComplete="new-password"
          maxLength={128}
          hint="Ít nhất 8 ký tự, tối đa 128 ký tự."
          error={a.fields.password}
          disabled={a.busy}
        />
      </View>
      <View>
        <Check
          label="Đồng ý tạo tài khoản và nhận email xác thực."
          value={consent}
          onChange={setConsent}
          disabled={a.busy}
        />
        <LinkText
          title="Thông tin sử dụng tài khoản"
          onPress={() => setPrivacy(true)}
        />
        {!!a.fields.acceptedTerms && (
          <T variant="caption" style={{ color: color.danger }}>
            {a.fields.acceptedTerms}
          </T>
        )}
      </View>
      <Button
        title="Tạo tài khoản"
        loading={a.busy}
        onPress={() =>
          void a.run(async () => {
            const result = await request<Challenge>("/auth/register", "POST", {
              displayName: name,
              email,
              password,
              acceptedTerms: consent,
            });
            session.beginVerification(result);
            setPassword("");
            router.replace("/auth/otp");
          })
        }
      />
      <LinkText
        title="Đã có tài khoản? Đăng nhập"
        onPress={() => router.replace("/auth/login")}
      />
      <T variant="caption" style={{ color: color.muted, textAlign: "center" }}>
        Một tài khoản. Nhiều hành động có ý nghĩa.
      </T>
      <Modal
        visible={privacy}
        transparent
        animationType="fade"
        onRequestClose={() => setPrivacy(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Heading
              title="Tài khoản GreenSteps"
              description="Email dùng để đăng nhập và nhận mã xác thực. Tên bạn chọn sẽ hiển thị trong ứng dụng."
            />
            <T>
              Đây là phiên bản đồ án đang phát triển. Bạn có thể đăng xuất khỏi
              thiết bị bất cứ lúc nào.
            </T>
            <Button title="Đã hiểu" onPress={() => setPrivacy(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
export function Otp() {
  const session = useSession(),
    pending = session.pending,
    a = useAction();
  const [code, setCode] = useState(""),
    [seconds, setSeconds] = useState(0),
    [notice, setNotice] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  useEffect(() => {
    const update = () =>
      setSeconds(
        pending
          ? Math.max(
              0,
              Math.ceil((Date.parse(pending.resendAt) - Date.now()) / 1000),
            )
          : 0,
      );
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [pending]);
  if (session.user) return <Redirect href="/home" />;
  if (!pending) return <Redirect href="/auth/login" />;
  return (
    <Screen padding={width < 360 ? 20 : 24}>
      <StatusBar style="dark" />
      <Nav title="XÁC THỰC EMAIL" />
      <View style={{ alignItems: "center" }}>
        <Art source={art.otp_security} width={280} height={164} />
      </View>
      <View style={{ gap: 12 }}>
        <T accessibilityRole="header" style={styles.otpTitle}>
          Kiểm tra email nhé!
        </T>
        <T style={styles.centerMuted}>
          Nhập mã xác thực gồm 6 chữ số đã gửi đến
        </T>
      </View>
      <T
        variant="label"
        style={{ color: color.primary, textAlign: "center", fontSize: 14 }}
      >
        {pending.email}
      </T>
      <Notice message={a.error} />
      <Notice success message={notice} />
      <OTPInput value={code} onChange={setCode} disabled={a.busy} large />
      <LinkText
        title="Dán mã từ email"
        onPress={() =>
          void a.run(async () => {
            const text = (await Clipboard.getStringAsync()).replace(/\s/g, "");
            if (!/^\d{6}$/.test(text))
              throw new Error(
                "Nội dung đã sao chép chưa phải mã gồm 6 chữ số.",
              );
            setCode(text);
          })
        }
      />
      <Button
        title={
          seconds > 0
            ? `Gửi lại mã sau ${seconds}s`
            : "Chưa nhận được mã? Gửi lại"
        }
        variant="ghost"
        disabled={seconds > 0 || a.busy}
        onPress={() =>
          void a.run(async () => {
            try {
              const next = await request<Challenge>(
                "/auth/otp/resend",
                "POST",
                { challengeId: pending.challengeId },
              );
              session.beginVerification(next);
              setCode("");
              setNotice("Mã mới đã được gửi. Vui lòng sử dụng email mới nhất.");
            } catch (error) {
              if (error instanceof ApiError && error.retryAfterSeconds)
                session.beginVerification({
                  ...pending,
                  resendAt: new Date(
                    Date.now() + error.retryAfterSeconds * 1000,
                  ).toISOString(),
                });
              throw error;
            }
          })
        }
      />
      <Button
        title="Xác thực và tiếp tục"
        loading={a.busy}
        onPress={() =>
          void a.run(async () => {
            if (!/^\d{6}$/.test(code))
              throw new Error("Vui lòng nhập đủ 6 chữ số.");
            await request("/auth/otp/verify", "POST", {
              challengeId: pending.challengeId,
              code,
            });
            session.beginVerification(null);
            setCode("");
            router.replace({
              pathname: "/auth/login",
              params: { verified: "1" },
            });
          })
        }
      />
      <T variant="caption" style={{ color: color.muted, textAlign: "center" }}>
        Mã có hiệu lực 5 phút. Đừng quên kiểm tra thư mục Spam / Thư rác.
      </T>
      <LinkText
        title="Quay về đăng nhập"
        onPress={() => {
          session.beginVerification(null);
          router.replace("/auth/login");
        }}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  back: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: color.white,
    alignItems: "center",
    justifyContent: "center",
  },
  loginHero: { backgroundColor: color.primary, paddingHorizontal: 24 },
  loginForm: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    backgroundColor: color.white,
    marginTop: -36,
    padding: 24,
    paddingTop: 32,
    gap: 16,
    flex: 1,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  line: { flex: 1, height: 1, backgroundColor: color.line },
  social: {
    flex: 1,
    minHeight: 54,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: 16,
  },
  security: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  otpTitle: {
    fontFamily: font.bold,
    fontSize: 32,
    lineHeight: 42,
    textAlign: "center",
  },
  centerMuted: {
    fontSize: 15,
    lineHeight: 24,
    color: color.muted,
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#16456166",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: color.white,
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    padding: 24,
    gap: 20,
  },
});
