# GreenSteps — Task 2: Kết nối Expo → API → database

Bản này chỉ có phần đã được duyệt: cấu trúc mobile/api/admin từ Task 1 và cấu hình, kiểm tra kết nối của Task 2. Các phần tài khoản, OTP, hồ sơ, giao diện chức năng và admin nghiệp vụ chưa được đưa vào bản này.

## Phạm vi

- Mobile: Expo SDK 57, React Native, TypeScript, Expo Router. Màn đầu tiên là **Kiểm tra kết nối**.
- Backend: NestJS; endpoint GET /api/v1/health chạy SELECT 1 qua Prisma/PostgreSQL adapter trước khi báo thành công.
- Database: cấu hình PostgreSQL 17 qua Docker. Không tạo bảng tài khoản, không chạy migration nghiệp vụ.
- Lỗi: database mất kết nối trả HTTP 503; app không kết nối được API có thông báo và nút kiểm tra lại.
- Admin: giữ thư mục của Task 1, chưa có chức năng.

Prisma cần một model để sinh client. SystemMeta chỉ là mô hình kỹ thuật dự phòng; Task 2 không tạo bảng này, không đọc/ghi dữ liệu vào nó.

## Chạy trên máy của bạn

Cần Node.js LTS phù hợp (khuyến nghị Node 24), Docker Desktop và Expo Go. Mở terminal ở thư mục greensteps-task2:

```sh
npm ci
npm run setup:local
npm run db:generate
docker compose up -d
```

Mở terminal thứ nhất:

```sh
npm run dev:api
```

API kiểm tra tại http://localhost:3000/api/v1/health; tài liệu tại http://localhost:3000/docs.

Mở terminal thứ hai:

```sh
npm run dev:mobile
```

### Trên điện thoại

1. Cho điện thoại và máy tính dùng cùng mạng Wi-Fi.
2. Sửa apps/mobile/.env thành EXPO_PUBLIC_API_URL=http://IP_LAN_CUA_MAY:3000/api/v1.
3. Dừng/chạy lại Expo, mở Expo Go và quét QR trong terminal.
4. Bấm **Kiểm tra kết nối**. Cả hai dòng Expo → API và API → Database phải báo đã kết nối.

localhost trên điện thoại không trỏ vào máy tính. API phải đang chạy và cổng 3000 phải truy cập được qua LAN. Không cần đăng nhập hoặc gửi mật khẩu Expo để thử bằng Expo Go.

Muốn thử giao diện web trên máy: chạy npm run web -w @greensteps/mobile. CORS mặc định cho http://localhost:8081; nếu dùng host/cổng khác, sửa CORS_ORIGINS trong apps/api/.env rồi khởi động lại API.

## Response mong đợi

```json
{
  "status": "ok",
  "service": "greensteps-api",
  "database": "connected",
  "checkedAt": "2026-10-18T13:00:00.000Z"
}
```

Thời gian trong ví dụ chỉ minh họa. Màn Expo hiển thị thời gian thực của lần kiểm tra.

## Kiểm tra mã nguồn

```sh
npm run typecheck
npm run lint
npm run build
npm test
npm run build:mobile
npm run build:android
```

4 bài test chỉ kiểm tra Task 2: health thành công, chưa có bảng nghiệp vụ, endpoint tài khoản trả 404, database ngắt thì health trả 503. Test dùng engine PostgreSQL WASM (PGlite) qua socket và Prisma, không thay SELECT 1 bằng dữ liệu giả.

Kết quả thực hiện và giới hạn kiểm thử được ghi ở docs/TASK2-RESULT.md. Bundle Android là mã JavaScript/Hermes, chưa phải APK cài đặt.

## Cấu hình

setup:local tạo root .env và apps/api/.env bằng mật khẩu database ngẫu nhiên; giữ nguyên nếu đã có. File .env không nằm trong gói mã nguồn. Cấu hình public của mobile chỉ chứa địa chỉ API.

.npmrc tắt lifecycle script tự động của dependency; scripts/prisma.mjs tắt checkpoint của Prisma. Lệnh db:generate vẫn sinh client bình thường.

## Điểm dừng duyệt

Sau khi bạn kiểm tra và duyệt Task 2, mới tiến hành Task 3: thiết kế database tài khoản, hồ sơ, phiên đăng nhập và OTP. Không chạy Task 3 trong bản này.
