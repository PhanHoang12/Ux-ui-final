import { Inject, Injectable, HttpException } from "@nestjs/common";
import { Database } from "../db";
import { CONFIG, type Config } from "../config";
import { fail } from "../common";
import { hmac } from "./crypto";
@Injectable()
export class AuthClock {
  now() {
    return new Date();
  }
}
@Injectable()
export class AuthLimiter {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(CONFIG) private readonly cfg: Config,
    @Inject(AuthClock) private readonly clock: AuthClock,
  ) {}
  secret() {
    if (!this.cfg.AUTH_SECRET)
      fail(
        503,
        "AUTH_NOT_CONFIGURED",
        "Chưa cấu hình xác thực. Chạy npm run setup:local rồi khởi động lại API.",
      );
    return this.cfg.AUTH_SECRET;
  }
  async limit(
    scope: string,
    identity: string,
    max: number,
    milliseconds = 15 * 60000,
  ) {
    const key = hmac(this.secret(), `${scope}:${identity}`),
      now = this.clock.now(),
      until = new Date(now.getTime() + milliseconds);
    const rows = await this.db.$queryRaw<{ count: number; expiresAt: Date }[]>`
      INSERT INTO "AuthThrottle" ("key", "count", "expiresAt") VALUES (${key}, 1, ${until})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "AuthThrottle"."expiresAt" <= ${now} THEN 1 ELSE "AuthThrottle"."count" + 1 END,
        "expiresAt" = CASE WHEN "AuthThrottle"."expiresAt" <= ${now} THEN ${until} ELSE "AuthThrottle"."expiresAt" END
      RETURNING "count", "expiresAt"`;
    if (rows[0]!.count > max)
      throw new HttpException(
        {
          code: "RATE_LIMITED",
          message: "Bạn thao tác quá nhiều lần. Vui lòng thử lại sau.",
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((rows[0]!.expiresAt.getTime() - now.getTime()) / 1000),
          ),
        },
        429,
      );
  }
}
