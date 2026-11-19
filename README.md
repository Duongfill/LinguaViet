# LinguaViet – App học tiếng Anh, tiếng Trung & tiếng Nhật

Web app (React + Vite) + backend (Node/Express + SQLite) cho người Việt học tiếng Anh, tiếng Trung và tiếng Nhật.

## Tính năng
- **Tài khoản**: đăng ký / đăng nhập (JWT), lưu tiến độ trên server.
- **Flashcard + SRS**: ôn tập lặp lại ngắt quãng (SM-2), 4 mức Quên/Khó/Nhớ/Dễ, phím tắt Space, 1–4.
- **Quiz**: từ→nghĩa, nghĩa→từ, nghe→chọn từ, gõ từ (tiếng Trung gõ được chữ Hán hoặc pinyin không dấu).
- **Luyện chữ Hán**: xem thứ tự nét và tự viết có chấm (thư viện hanzi-writer).
- **Luyện phát âm**: nghe mẫu (TTS), đọc vào micro, chấm điểm độ giống (Web Speech API).
- **Luyện đề TOEIC / IELTS** (tiếng Anh): Listening (giọng máy nhiều người nói) + Reading chấm tự động, quy đổi điểm/band ước lượng, giải thích tiếng Việt; IELTS Writing (biểu đồ) + Speaking có bài mẫu để tự chấm. Thêm đề: xem `tools/exams/EXAM-SPEC.md`.
- **Ngữ pháp** (Anh A1–C1, Trung HSK1–6, Nhật N5–N1): 200 bài có giải thích tiếng Việt, ví dụ có nghe, lỗi hay gặp, ~1.800 bài tập (trắc nghiệm, điền từ, sắp xếp câu), tiến độ và ôn bài yếu. Dữ liệu: `tools/grammar/GRAMMAR-SPEC.md`.
- **Luyện viết** (Anh/Trung/Nhật): đặt câu với từ đã học (cộng XP), viết theo chủ đề theo trình độ kèm đoạn mẫu, nhật ký bài viết; ngân hàng 24 đề IELTS Writing; TOEIC Writing trong đề TOEIC. Dữ liệu: `tools/writing/WRITING-SPEC.md`.
- **Thống kê**: chuỗi ngày học, mục tiêu ngày, số từ đã thuộc, biểu đồ 7 ngày.

## Chạy thử
```bash
npm install
npm run dev
```
- Client: http://localhost:5273  (proxy `/api` → server)
- API: http://localhost:3101

Tài khoản thử nghiệm đã tạo sẵn trong DB dev: `test@langapp.test` / `test123456` (xoá file `server/langapp.db` để làm lại từ đầu).

Lần chạy đầu server tự tạo `server/langapp.db` và nạp dữ liệu (tiếng Anh A1–B2 ~5.000 từ, tiếng Trung HSK 1–6 ~5.000 từ, tiếng Nhật JLPT N5–N1 ~8.000 từ). Nguồn và giấy phép: `DATA_LICENSES.md`; quy trình tạo: `tools/vocab-pipeline/` (tiếng Nhật: `ja.mjs` + `INSTRUCTIONS-ja.md`).
DB đã có dữ liệu thì sau khi cập nhật kho từ cần chạy `npm run seed` để nạp thêm.

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
