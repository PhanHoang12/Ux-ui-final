import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Module,
  Post,
  Req,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Request } from "express";
import { ConnectionModule } from "../connection.module";
import { AuthService } from "./auth.service";
import { AuthClock, AuthLimiter } from "./support";
import { Mailer } from "./mailer";
const string = { type: "string" as const };
const otp = {
  type: "object" as const,
  required: ["challengeId"],
  properties: { challengeId: { ...string, format: "uuid" } },
  additionalProperties: false,
};
@ApiTags("Tài khoản")
@ApiResponse({
  status: 400,
  description: "Dữ liệu nhập hoặc mã OTP không hợp lệ.",
})
@ApiResponse({
  status: 429,
  description: "Giới hạn thao tác; xem error.retryAfterSeconds.",
})
@ApiResponse({
  status: 503,
  description:
    "Chưa cấu hình AUTH_SECRET/SMTP hoặc dịch vụ email không sẵn sàng.",
})
@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Post("register")
  @ApiOperation({
    summary: "Đăng ký tài khoản chờ xác minh, gửi OTP email 5 phút.",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["displayName", "email", "password", "acceptedTerms"],
      properties: {
        displayName: string,
        email: { ...string, format: "email" },
        password: { ...string, minLength: 8, maxLength: 128, writeOnly: true },
        acceptedTerms: { type: "boolean", enum: [true] },
      },
      additionalProperties: false,
    },
  })
  @ApiResponse({
    status: 409,
    description: "Email đã đăng ký; đăng nhập để tiếp tục xác minh nếu cần.",
  })
  register(@Body() body: unknown, @Req() req: Request) {
    return this.auth.register(body, req.ip ?? "unknown");
  }
  @Post("otp/verify")
  @HttpCode(200)
  @ApiOperation({
    summary: "Xác minh OTP 6 số, tối đa 5 lần thử. Không tự đăng nhập.",
  })
  @ApiBody({
    schema: {
      ...otp,
      required: ["challengeId", "code"],
      properties: {
        ...otp.properties,
        code: { ...string, pattern: "^[0-9]{6}$", writeOnly: true },
      },
    },
  })
  verify(@Body() body: unknown, @Req() req: Request) {
    return this.auth.verify(body, req.ip ?? "unknown");
  }
  @Post("otp/resend")
  @HttpCode(200)
  @ApiOperation({
    summary: "Gửi lại sau 60 giây, vô hiệu mã cũ; không tiết lộ OTP.",
  })
  @ApiBody({ schema: otp })
  resend(@Body() body: unknown, @Req() req: Request) {
    return this.auth.resend(body, req.ip ?? "unknown");
  }
  @Post("login")
  @HttpCode(200)
  @ApiOperation({
    summary:
      "Đăng nhập hoặc tiếp tục xác minh tài khoản pending. Access token 15 phút; phiên 1/30 ngày.",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { ...string, format: "email" },
        password: { ...string, writeOnly: true },
        remember: { type: "boolean", default: true },
        deviceName: { ...string, maxLength: 120 },
      },
      additionalProperties: false,
    },
  })
  login(@Body() body: unknown, @Req() req: Request) {
    return this.auth.login(body, req.ip ?? "unknown");
  }
  @Post("refresh")
  @HttpCode(200)
  @ApiOperation({
    summary: "Xoay refresh token một lần; dùng lại token cũ thu hồi cả phiên.",
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["refreshToken"],
      properties: { refreshToken: { ...string, writeOnly: true } },
      additionalProperties: false,
    },
  })
  refresh(@Body() body: unknown, @Req() req: Request) {
    return this.auth.refresh(body, req.ip ?? "unknown");
  }
  @Post("logout")
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Thu hồi phiên hiện tại." })
  logout(@Headers("authorization") header?: string) {
    return this.auth.logout(header);
  }
}
@ApiTags("Tài khoản")
@Controller("me")
export class MeController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Thông tin tài khoản từ phiên server; không nhận userId từ client.",
  })
  me(@Headers("authorization") header?: string) {
    return this.auth.me(header);
  }
}
@Module({
  imports: [ConnectionModule],
  providers: [AuthService, AuthClock, AuthLimiter, Mailer],
  controllers: [AuthController, MeController],
})
export class AuthModule {}
