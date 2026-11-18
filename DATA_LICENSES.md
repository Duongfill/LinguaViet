# Nguồn dữ liệu từ vựng

Các file `server/src/data/generated-en.json`, `generated-zh.json` và `generated-ja.json` được tạo từ những danh sách mở sau.
Danh sách từ, trình độ, phiên âm lấy từ nguồn; nghĩa tiếng Việt, câu ví dụ, bản dịch và chủ đề do AI soạn (chưa duyệt thủ công).

| Dữ liệu | Nguồn | Giấy phép |
|---|---|---|
| Từ vựng HSK 1–6 (bản cũ), pinyin | [drkameleon/complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) | MIT |
| CEFR-J Vocabulary Profile 1.5 (A1–B2) | [openlanguageprofiles/olp-en-cefrj](https://github.com/openlanguageprofiles/olp-en-cefrj) — Tono Laboratory, TUFS | xem README của repo (yêu cầu trích dẫn nguồn) |
| Octanove Vocabulary Profile C1/C2 | [openlanguageprofiles/olp-en-cefrj](https://github.com/openlanguageprofiles/olp-en-cefrj) | CC BY-SA 4.0 |
| Từ vựng JLPT N5–N1, cách đọc kana | [jamsinclair/open-anki-jlpt-decks](https://github.com/jamsinclair/open-anki-jlpt-decks) (dựa trên danh sách của Jonathan Waller, [tanos.co.uk](http://www.tanos.co.uk/jlpt/)) | MIT; danh sách gốc CC BY — ghi công Jonathan Waller |
| Phiên âm IPA tiếng Anh (en_US) | [open-dict-data/ipa-dict](https://github.com/open-dict-data/ipa-dict) | MIT |

Do có dữ liệu CC BY-SA 4.0, nếu phân phối lại `generated-en.json` cần giữ ghi công và cùng giấy phép CC BY-SA 4.0.

## Đề luyện TOEIC / IELTS

Các đề trong `server/src/data/exams/` là **nội dung tự soạn bằng AI theo dạng thức** TOEIC Listening & Reading và IELTS Academic — không sao chép đề thật hay sách luyện thi có bản quyền (ETS, British Council, IDP, Cambridge). Tên người, công ty, số liệu trong đề là hư cấu. Đặc tả: `tools/exams/EXAM-SPEC.md`; kiểm tra: `node tools/exams/check.mjs <thư mục đề>`. Điểm quy đổi TOEIC / band IELTS trong app chỉ là ước lượng.
