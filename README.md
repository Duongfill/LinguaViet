# LinguaViet – App học tiếng Anh & tiếng Trung

Web app (React + Vite) + backend (Node/Express + SQLite) cho người Việt học tiếng Anh và tiếng Trung.

## Tính năng
- **Tài khoản**: đăng ký / đăng nhập (JWT), lưu tiến độ trên server.
- **Flashcard + SRS**: ôn tập lặp lại ngắt quãng (SM-2), 4 mức Quên/Khó/Nhớ/Dễ, phím tắt Space, 1–4.
- **Quiz**: từ→nghĩa, nghĩa→từ, nghe→chọn từ, gõ từ (tiếng Trung gõ được chữ Hán hoặc pinyin không dấu).
- **Luyện chữ Hán**: xem thứ tự nét và tự viết có chấm (thư viện hanzi-writer).
- **Luyện phát âm**: nghe mẫu (TTS), đọc vào micro, chấm điểm độ giống (Web Speech API).
- **Thống kê**: chuỗi ngày học, mục tiêu ngày, số từ đã thuộc, biểu đồ 7 ngày.

## Chạy thử
```bash
npm install
npm run dev
```
- Client: http://localhost:5273  (proxy `/api` → server)
- API: http://localhost:3101

Tài khoản thử nghiệm đã tạo sẵn trong DB dev: `test@langapp.test` / `test123456` (xoá file `server/langapp.db` để làm lại từ đầu).

Lần chạy đầu server tự tạo `server/langapp.db` và nạp dữ liệu (301 bộ, 10.015 từ: 4.997 tiếng Anh A1–B2, 5.018 tiếng Trung HSK 1–6). Nguồn và giấy phép: `DATA_LICENSES.md`; quy trình tạo: `tools/vocab-pipeline/`.

## Production
```bash
npm run build
NODE_ENV=production JWT_SECRET=chuoi-bi-mat API_PORT=3101 npm start   # server phục vụ luôn client/dist
```
Hướng dẫn đưa lên mạng (HTTPS, điện thoại, thông báo): xem [DEPLOY.md](DEPLOY.md).

## Thêm từ vựng
Sửa các file trong `server/src/data/` (`vocab.js`, `en-more.js`, `en-b1b2.js`, `zh-more.js`, `zh-hsk345.js`) rồi chạy `npm run seed` (upsert theo slug/term, không mất tiến độ).

## Lưu ý
- Nhận dạng giọng nói chỉ chạy trên **Chrome / Edge** (cần quyền micro, trang phải là `localhost` hoặc HTTPS).
- Dữ liệu nét chữ Hán tải từ CDN jsDelivr → cần mạng.
- Giọng đọc phụ thuộc giọng TTS cài trong hệ điều hành (Windows: cài thêm gói ngôn ngữ Chinese nếu không có giọng tiếng Trung).
