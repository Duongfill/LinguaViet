# Quy trình tạo kho từ lớn

1. Tải nguồn (xem `DATA_LICENSES.md`) vào một thư mục `dl/`: `hsk1..6.json`, `cefrj.csv`, `octanove.csv`, `en_US.txt`.
2. `node build.mjs <dl> .`  → `items.json` + các lô `in/*.json` (bỏ những từ đã có trong DB).
3. `node fixzh.mjs <dl>`    → chọn âm đọc/nghĩa thông dụng cho từ HSK.
4. Cho agent AI làm từng lô theo `INSTRUCTIONS.md` → `out/*.jsonl`; kiểm tra bằng `node check.mjs --all`.
5. `node assemble.mjs`      → ghi `server/src/data/generated-en.json`, `generated-zh.json`.
6. `npm run seed` ở thư mục gốc app.
