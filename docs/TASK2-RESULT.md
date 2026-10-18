# Kết quả Task 2

Ngày: 18/10/2026. Trạng thái: chờ người dùng duyệt.

## Nội dung đã có

- Workspace mobile/api/admin; admin giữ cấu trúc, chưa triển khai chức năng.
- Expo/TypeScript, màn Kiểm tra kết nối, cấu hình địa chỉ API theo môi trường.
- NestJS, GET /api/v1/health, truy vấn SELECT 1 qua Prisma/PostgreSQL adapter.
- Cấu hình PostgreSQL Docker; tạo mật khẩu database local ngẫu nhiên.
- Xử lý API không truy cập được và database ngắt kết nối.
- Không có endpoint tài khoản/OTP và không chạy migration nghiệp vụ.

## Bằng chứng kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| TypeScript mobile/API | Qua |
| ESLint và kiểm tra text native | Qua |
| Build NestJS và client Prisma | Qua |
| 4 ca HTTP/database | Qua |
| Expo web export | Qua |
| Expo Android bundle | Qua |

4 ca kiểm thử gồm: health kết nối thành công; database chưa có bảng nghiệp vụ; endpoint tài khoản trả 404; database ngắt kết nối trả 503.

## Giới hạn xác minh

Test database dùng PostgreSQL WASM (PGlite) qua socket và Prisma. Chưa chạy Docker/PostgreSQL thông thường trong môi trường này. Chưa thử thao tác trên điện thoại Expo Go và chưa tạo APK. Bundle thành công không thay thế kiểm thử thiết bị.

Để xác nhận toàn tuyến trên điện thoại: chạy PostgreSQL và API theo README, sửa IP LAN trong apps/mobile/.env, mở Expo Go rồi bấm Kiểm tra kết nối. Cần cả hai dòng kết nối báo thành công.

Sau khi người dùng duyệt Task 2 mới thực hiện Task 3.
