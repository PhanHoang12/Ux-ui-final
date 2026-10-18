import {
  forwardRef,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  type TextInputProps,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image, type ImageSource } from "expo-image";
import { art } from "../lib/art";
import { color, font, typography, radius, space, size } from "../theme/tokens";
export { color, font } from "../theme/tokens";

export function T({
  variant = "body",
  style,
  ...props
}: ComponentProps<typeof Text> & { variant?: keyof typeof typography }) {
  return (
    <Text
      {...props}
      style={[{ color: color.text }, typography[variant], style]}
    />
  );
}
export function Art({
  source,
  width,
  height = width,
}: {
  source: ImageSource;
  width: number;
  height?: number;
}) {
  return (
    <Image
      source={source}
      style={{ width, height }}
      contentFit="contain"
      accessible={false}
    />
  );
}
export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.content}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Heading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <View style={{ gap: space.sm }}>
      <T accessibilityRole="header" variant="display">
        {title}
      </T>
      {!!description && <T style={{ color: color.muted }}>{description}</T>}
    </View>
  );
}
type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  title: string;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  style?: StyleProp<ViewStyle>;
};
export function Button({
  title,
  loading = false,
  disabled = false,
  variant = "primary",
  style,
  accessibilityLabel,
  onFocus,
  onBlur,
  ...props
}: ButtonProps) {
  const [focused, setFocused] = useState(false);
  const blocked = disabled || loading;
  const ink = disabled
    ? color.disabledText
    : variant === "primary"
      ? color.white
      : color.primary;
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed &&
          (variant === "primary"
            ? { backgroundColor: color.primaryPressed }
            : { backgroundColor: color.soft }),
        disabled && styles.buttonDisabled,
        focused && { borderColor: color.text, borderWidth: 2 },
        style,
      ]}
    >
      {loading && <ActivityIndicator color={ink} size="small" />}
      <T
        variant="button"
        style={{ color: ink, textAlign: "center", flexShrink: 1 }}
      >
        {loading ? "Đang xử lý…" : title}
      </T>
    </Pressable>
  );
}
export function LinkText({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return <Button title={title} variant="ghost" onPress={onPress} />;
}
type FieldProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  password?: boolean;
  disabled?: boolean;
};
export const Field = forwardRef<TextInput, FieldProps>(function Field(
  {
    label,
    error,
    hint,
    password = false,
    disabled = false,
    style,
    onFocus,
    onBlur,
    editable,
    accessibilityHint,
    ...props
  },
  ref,
) {
  const [focused, setFocused] = useState(false),
    [visible, setVisible] = useState(false);
  const blocked = disabled || editable === false;
  return (
    <View style={{ gap: space.sm }}>
      <T variant="label">{label}</T>
      <View
        style={[
          styles.inputWrap,
          focused && styles.inputFocus,
          !!error && styles.inputError,
          blocked && styles.inputDisabled,
        ]}
      >
        <TextInput
          {...props}
          ref={ref}
          accessibilityLabel={props.accessibilityLabel ?? label}
          accessibilityHint={
            error ? `Lỗi: ${error}` : (accessibilityHint ?? hint)
          }
          accessibilityState={{
            ...props.accessibilityState,
            disabled: blocked,
          }}
          editable={!blocked}
          autoCapitalize={props.autoCapitalize ?? "none"}
          secureTextEntry={password ? !visible : props.secureTextEntry}
          placeholderTextColor={color.placeholder}
          selectionColor={color.primary}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            blocked && { color: color.disabledText },
            style,
          ]}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            accessibilityState={{ disabled: blocked, expanded: visible }}
            disabled={blocked}
            onPress={() => setVisible((value) => !value)}
            style={styles.eye}
          >
            <Art source={art.eye} width={24} />
          </Pressable>
        )}
      </View>
      {!!error && (
        <T
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          variant="caption"
          style={{ color: color.danger }}
        >
          {error}
        </T>
      )}
      {!error && !!hint && (
        <T variant="caption" style={{ color: color.muted }}>
          {hint}
        </T>
      )}
    </View>
  );
});
export function Check({
  value,
  onChange,
  label,
  disabled = false,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={[styles.checkRow, disabled && { opacity: 0.6 }]}
    >
      <View
        style={[
          styles.checkBox,
          value && {
            backgroundColor: color.primary,
            borderColor: color.primary,
          },
        ]}
      >
        {value && <Art source={art.check} width={18} />}
      </View>
      <T variant="caption" style={{ color: color.muted, flex: 1 }}>
        {label}
      </T>
    </Pressable>
  );
}
export function OTPInput({
  value,
  onChange,
  error,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  const ref = useRef<TextInput>(null),
    [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: space.sm }}>
      <T variant="label">Mã xác thực</T>
      <View style={styles.otpWrap}>
        <View pointerEvents="none" accessible={false} style={styles.otpCells}>
          {Array.from({ length: 6 }, (_, index) => (
            <View
              key={index}
              style={[
                styles.otpCell,
                focused &&
                  Math.min(value.length, 5) === index &&
                  styles.inputFocus,
                !!error && styles.inputError,
                disabled && styles.inputDisabled,
              ]}
            >
              <T variant="title">{value[index] ?? ""}</T>
            </View>
          ))}
        </View>
        <TextInput
          ref={ref}
          value={value}
          editable={!disabled}
          accessibilityLabel="Mã xác thực gồm 6 chữ số"
          accessibilityHint={error ?? "Có thể nhập hoặc dán cả 6 chữ số."}
          accessibilityState={{ disabled }}
          onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, 6))}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.otpInput}
        />
      </View>
      {!!error && (
        <T
          accessibilityRole="alert"
          variant="caption"
          style={{ color: color.danger }}
        >
          {error}
        </T>
      )}
    </View>
  );
}
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <T variant="caption" style={{ color: color.primary }}>
        {label}
      </T>
    </View>
  );
}
export function Notice({
  message,
  success = false,
  variant = success ? "success" : "error",
}: {
  message?: string | null;
  success?: boolean;
  variant?: "error" | "success" | "info";
}) {
  if (!message) return null;
  const ink =
    variant === "success"
      ? color.success
      : variant === "error"
        ? color.danger
        : color.text;
  const bg =
    variant === "success"
      ? color.successBg
      : variant === "error"
        ? color.dangerBg
        : color.soft;
  return (
    <View
      accessibilityRole={variant === "error" ? "alert" : undefined}
      accessibilityLiveRegion="polite"
      style={[styles.notice, { backgroundColor: bg }]}
    >
      <T style={{ color: ink }}>{message}</T>
    </View>
  );
}
export function LoadingState({
  label = "Đang tải nội dung…",
}: {
  label?: string;
}) {
  return (
    <View accessibilityState={{ busy: true }} style={styles.state}>
      <ActivityIndicator color={color.primary} />
      <T style={{ color: color.muted }}>{label}</T>
    </View>
  );
}
export function EmptyState({
  title,
  description,
  onAction,
  actionLabel,
}: {
  title: string;
  description: string;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <View style={styles.state}>
      <T variant="title" style={{ textAlign: "center" }}>
        {title}
      </T>
      <T style={{ textAlign: "center", color: color.muted }}>{description}</T>
      {onAction && actionLabel && (
        <Button variant="secondary" title={actionLabel} onPress={onAction} />
      )}
    </View>
  );
}
export const s = StyleSheet.create({
  card: {
    padding: space.xl,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.white,
    gap: space.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
});
const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: color.bg },
  scroll: { flexGrow: 1, alignItems: "center" },
  content: {
    width: "100%",
    maxWidth: size.contentMax,
    padding: space.page,
    gap: space.page,
  },
  button: {
    minHeight: size.control,
    borderRadius: radius.button,
    paddingHorizontal: space.xl,
    paddingVertical: 15,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  primary: { backgroundColor: color.primary, borderColor: color.primary },
  secondary: { backgroundColor: color.white, borderColor: color.line },
  ghost: { backgroundColor: "transparent", borderColor: "transparent" },
  buttonDisabled: {
    backgroundColor: color.disabled,
    borderColor: color.disabled,
  },
  inputWrap: {
    minHeight: size.control,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.input,
    backgroundColor: color.white,
    flexDirection: "row",
    alignItems: "center",
  },
  inputFocus: { borderColor: color.primary, backgroundColor: color.white },
  inputError: { borderColor: color.danger },
  inputDisabled: { backgroundColor: color.disabled },
  input: {
    minHeight: 54,
    flex: 1,
    minWidth: 0,
    paddingHorizontal: space.lg,
    paddingVertical: 15,
    fontFamily: font.regular,
    fontSize: 14,
    color: color.text,
    ...Platform.select({ web: { outlineWidth: 0 } }),
  },
  eye: {
    width: 52,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  checkRow: {
    minHeight: size.touch,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: radius.check,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.white,
    alignItems: "center",
    justifyContent: "center",
  },
  otpWrap: { minHeight: size.control, justifyContent: "center" },
  otpCells: { flexDirection: "row", gap: space.sm },
  otpCell: {
    flex: 1,
    minWidth: 0,
    minHeight: size.control,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.input,
    backgroundColor: color.white,
    paddingVertical: space.sm,
  },
  otpInput: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    color: "transparent",
    backgroundColor: "transparent",
    opacity: 0.02,
    fontSize: 16,
    ...Platform.select({ web: { outlineWidth: 0 } }),
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: color.soft,
    borderRadius: 99,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  notice: { padding: space.lg, borderRadius: radius.input },
  state: { alignItems: "center", paddingVertical: space.xl, gap: space.md },
});
