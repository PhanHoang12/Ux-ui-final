import { Inject, Injectable } from "@nestjs/common";
import nodemailer from "nodemailer";
import { CONFIG, type Config } from "../config";
import { fail } from "../common";
@Injectable()
export class Mailer {
  constructor(@Inject(CONFIG) private readonly cfg: Config) {}
  assertReady() {
    if (
      !this.cfg.SMTP_HOST ||
      !this.cfg.SMTP_FROM ||
      !this.cfg.SMTP_USER ||
      !this.cfg.SMTP_PASS
    )
      fail(
        503,
        "MAIL_NOT_CONFIGURED",
        "Chưa cấu hình email xác thực. Quản trị viên cần thiết lập SMTP.",
      );
  }
  async sendOtp(to: string, code: string) {
    this.assertReady();
    const transport = nodemailer.createTransport({
      host: this.cfg.SMTP_HOST,
      port: this.cfg.SMTP_PORT,
      secure: this.cfg.SMTP_PORT === 465,
      requireTLS: this.cfg.SMTP_PORT !== 465,
      auth: { user: this.cfg.SMTP_USER!, pass: this.cfg.SMTP_PASS! },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      logger: false,
      debug: false,
    });
    try {
      const result = await transport.sendMail({
        from: this.cfg.SMTP_FROM,
        to,
        subject: "GreenSteps · Mã xác thực email",
        text: `Mã xác thực GreenSteps của bạn: ${code}\n\nMã có hiệu lực 5 phút và chỉ dùng một lần. Không chia sẻ mã với người khác.\nNếu bạn không yêu cầu tạo tài khoản, hãy bỏ qua email này.`,
      });
      if (!result.accepted.length) throw new Error("Recipient rejected");
    } catch {
      fail(
        503,
        "MAIL_UNAVAILABLE",
        "Chưa gửi được email xác thực. Vui lòng thử lại sau.",
      );
    } finally {
      transport.close();
    }
  }
}
