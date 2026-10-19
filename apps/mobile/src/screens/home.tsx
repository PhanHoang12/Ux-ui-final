import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Art,
  Button,
  Card,
  EmptyState,
  Heading,
  LoadingState,
  Notice,
  T,
  color,
  font,
} from "../components/ui";
import { art } from "../lib/art";
import { useSession } from "../lib/session";
import { useAction } from "../lib/use-action";
export function Home() {
  const session = useSession(),
    user = session.user,
    action = useAction();
  const [feature, setFeature] = useState<string | null>(null);
  const { width, fontScale } = useWindowDimensions(),
    compact = width < 380 || fontScale > 1.2;
  useEffect(() => {
    if (user) void action.run(session.reload);
  }, [user?.id, session.reload]);
  if (session.loading)
    return (
      <View style={styles.center}>
        <LoadingState label="Đang tải tài khoản…" />
      </View>
    );
  if (!user) return <Redirect href="/auth/login" />;
  const shortcuts = [
    ["Phân loại", art.recycle],
    ["Thu gom", art.map],
    ["Cộng đồng", art.people],
    ["Tin tức", art.book],
  ] as const;
  const tabs = [
    ["Trang chủ", art.tab_home, 25],
    ["Thu gom", art.tab_map, 25],
    ["Quét rác", art.tab_scan, 26],
    ["Đổi quà", art.tab_gift, 25],
    ["Cá nhân", art.tab_user, 25],
  ] as const;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tài khoản của bạn"
          onPress={() => setFeature("Cá nhân")}
          style={styles.avatar}
        >
          <T variant="title" style={{ color: color.primary }}>
            {Array.from(user.displayName)[0]?.toUpperCase()}
          </T>
        </Pressable>
        <View style={{ flex: 1, gap: 3 }}>
          <T variant="title" style={{ fontSize: 21, lineHeight: 29 }}>
            Chào {user.displayName}!
          </T>
          <T variant="caption" style={{ fontSize: 11, color: color.muted }}>
            Hôm nay, mình cùng sống xanh nhé.
          </T>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thông báo"
          onPress={() => setFeature("Thông báo")}
          style={styles.bell}
        >
          <Art source={art.bell} width={24} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{ alignItems: "center", paddingBottom: 24 }}
      >
        <View style={styles.content}>
          <Notice message={action.error} />
          <View style={styles.hero}>
            <T variant="caption" style={{ color: color.white, fontSize: 10 }}>
              GREENSTEPS · MỖI NGÀY XANH
            </T>
            <T
              accessibilityRole="header"
              style={{
                color: color.white,
                fontFamily: font.bold,
                fontSize: 24,
                lineHeight: 34,
                marginTop: 14,
                maxWidth: compact ? undefined : Math.min(width, 480) - 224,
              }}
            >
              {"Phân loại rác.\nGieo mầm xanh."}
            </T>
            <T
              variant="caption"
              style={{
                color: color.white,
                marginTop: 8,
                maxWidth: compact ? undefined : 222,
              }}
            >
              {"Bắt đầu từ một món đồ nhỏ.\nTạo nên những thay đổi lớn."}
            </T>
            <View
              style={
                compact
                  ? { alignSelf: "center", marginVertical: 12 }
                  : { position: "absolute", right: 14, top: 55 }
              }
            >
              <Art source={art.earth} width={122} height={145} />
            </View>
            <Button
              title="Quét rác ngay"
              variant="secondary"
              style={{ alignSelf: "flex-start", minHeight: 48, marginTop: 8 }}
              onPress={() => setFeature("Quét rác")}
            />
          </View>
          <View style={{ gap: 12 }}>
            <T variant="title" style={{ fontSize: 19 }}>
              Bạn muốn làm gì?
            </T>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {shortcuts.map(([name, source]) => (
                <Pressable
                  key={name}
                  accessibilityRole="button"
                  accessibilityLabel={name}
                  onPress={() => setFeature(name)}
                  style={styles.shortcut}
                >
                  <View style={styles.shortcutIcon}>
                    <Art source={source} width={27} />
                  </View>
                  <T
                    variant="caption"
                    style={{ textAlign: "center", fontSize: 11 }}
                  >
                    {name}
                  </T>
                </Pressable>
              ))}
            </View>
          </View>
          <Card style={{ backgroundColor: "#DCEEF9", borderWidth: 0 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
            >
              <View style={styles.shortcutIcon}>
                <Art source={art.gift} width={26} />
              </View>
              <View style={{ flex: 1 }}>
                <T variant="caption" style={{ color: color.muted }}>
                  ĐIỂM XANH CỦA BẠN
                </T>
                <T variant="display" style={{ color: color.primary }}>
                  —
                </T>
              </View>
              <Button
                title="Đổi quà"
                variant="ghost"
                onPress={() => setFeature("Đổi quà")}
              />
            </View>
            <T variant="caption" style={{ color: color.muted }}>
              Chưa có dữ liệu điểm xanh.
            </T>
            <View style={{ height: 1, backgroundColor: color.line }} />
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Art source={art.home_leaf} width={24} />
              <T variant="label" style={{ flex: 1 }}>
                Email đã được xác thực
              </T>
            </View>
          </Card>
          <View style={{ gap: 12 }}>
            <T variant="title" style={{ fontSize: 19 }}>
              Hoạt động xanh
            </T>
            <Card>
              <EmptyState
                title="Một hành trình mới"
                description="Các hoạt động mới sẽ sớm xuất hiện tại đây."
              />
            </Card>
          </View>
          <View style={{ gap: 12 }}>
            <T variant="title" style={{ fontSize: 19 }}>
              Tài khoản của bạn
            </T>
            <Card>
              <T variant="title">{user.displayName}</T>
              <T selectable>{user.email}</T>
              <Notice
                success
                message="Bạn đã sẵn sàng bắt đầu hành trình GreenSteps."
              />
              <Button
                title="Đồng bộ tài khoản"
                variant="secondary"
                loading={action.busy}
                onPress={() => void action.run(session.reload)}
              />
              <Button
                title="Xem bộ giao diện"
                variant="ghost"
                onPress={() => router.push("/ui")}
              />
            </Card>
          </View>
          <T
            variant="caption"
            style={{ color: color.muted, textAlign: "center" }}
          >
            Mỗi bước nhỏ của bạn đều có ý nghĩa.
          </T>
        </View>
      </ScrollView>
      <View style={styles.tabbar}>
        {tabs.map(([name, source, size]) => (
          <Pressable
            key={name}
            accessibilityRole="button"
            accessibilityLabel={name}
            accessibilityState={{ selected: name === "Trang chủ" }}
            onPress={() =>
              name === "Trang chủ"
                ? void action.run(session.reload)
                : setFeature(name)
            }
            style={styles.tab}
          >
            <View
              style={[
                styles.tabIcon,
                name === "Quét rác" && { backgroundColor: color.primary },
              ]}
            >
              <Art source={source} width={size} />
            </View>
            <T
              variant="caption"
              style={{
                fontSize: 9,
                lineHeight: 13,
                textAlign: "center",
                color: name === "Trang chủ" ? color.primary : color.muted,
              }}
            >
              {name}
            </T>
          </Pressable>
        ))}
      </View>
      <Modal
        visible={!!feature}
        transparent
        animationType="fade"
        onRequestClose={() => setFeature(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Heading
              title={
                feature === "Cá nhân"
                  ? user.displayName
                  : (feature ?? "GreenSteps")
              }
              description={
                feature === "Cá nhân"
                  ? user.email
                  : "Tính năng đang được chuẩn bị. Bạn có thể tiếp tục khám phá trang chủ."
              }
            />
            {feature === "Cá nhân" && (
              <>
                <Notice success message="Tài khoản đã xác thực email." />
                <Notice message={action.error} />
                <Button
                  title="Đăng xuất"
                  loading={action.busy}
                  onPress={() =>
                    void action.run(async () => {
                      await session.signOut();
                      router.replace("/auth/login");
                    })
                  }
                />
              </>
            )}
            <Button
              title="Đóng"
              variant="secondary"
              onPress={() => setFeature(null)}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", backgroundColor: color.bg },
  header: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    padding: 24,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#DCEEF9",
    alignItems: "center",
    justifyContent: "center",
  },
  bell: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.white,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { width: "100%", maxWidth: 480, paddingHorizontal: 24, gap: 24 },
  hero: {
    padding: 20,
    borderRadius: 28,
    backgroundColor: color.primary,
    overflow: "hidden",
  },
  shortcut: { flex: 1, alignItems: "center", gap: 10, paddingVertical: 4 },
  shortcutIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.white,
    alignItems: "center",
    justifyContent: "center",
  },
  tabbar: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: color.line,
    backgroundColor: color.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tab: { flex: 1, minHeight: 64, alignItems: "center", gap: 4 },
  tabIcon: {
    width: 52,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#16456166",
  },
  modal: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    padding: 24,
    gap: 20,
    backgroundColor: color.white,
  },
});
