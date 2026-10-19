import { z } from "zod";
const email = z
  .string()
  .trim()
  .max(254)
  .email("Địa chỉ email chưa hợp lệ.")
  .transform((value) => value.toLowerCase());
export const registerSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, "Họ tên cần ít nhất 2 ký tự.")
      .max(100),
    email,
    password: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự.").max(128),
    acceptedTerms: z.literal(true, {
      error: "Vui lòng đồng ý tạo tài khoản và nhận email xác thực.",
    }),
  })
  .strict();
export const loginSchema = z
  .object({
    email,
    password: z.string().min(1).max(128),
    remember: z.boolean().default(true),
    deviceName: z.string().trim().min(1).max(120).default("GreenSteps Mobile"),
  })
  .strict();
export const challengeSchema = z
  .object({ challengeId: z.string().uuid() })
  .strict();
export const verifySchema = challengeSchema.extend({
  code: z.string().regex(/^\d{6}$/, "Mã xác thực phải gồm 6 chữ số."),
});
export const refreshSchema = z
  .object({ refreshToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/) })
  .strict();
