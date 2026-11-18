# Đặc tả dữ liệu luyện viết

Mọi nội dung là **tự soạn** (không chép đề thật / sách có bản quyền). Tên người, công ty, số liệu là hư cấu.
Kiểm tra: `node tools/writing/check.mjs <file.json>` → phải in `OK`.

---

## 1. TOEIC Writing — `server/src/data/exams/toeic-XX/writing.json`
Dạng TOEIC Writing (8 câu, 60 phút):
```json
{
  "q1_5": [
    { "scene": "👩‍🍳🍳🔥", "alt": "A cook is frying eggs in a pan.", "words": ["cook", "pan"],
      "samples": ["The cook is frying eggs in a pan.", "A woman is cooking breakfast in a pan."] }
  ],
  "q6_7": [
    { "email": { "from": "...", "to": "...", "subject": "...", "text": "Dear ..., ...\n\nBest regards,\n..." },
      "task": "Respond to the e-mail as the store manager. In your e-mail, give TWO pieces of information and ask ONE question.",
      "sample": "Câu trả lời mẫu ~100–140 từ", "notes_vi": "Gợi ý / lỗi hay gặp (tiếng Việt)" }
  ],
  "q8": { "prompt": "Opinion question ...", "sample": "Bài mẫu ~300–340 từ", "notes_vi": "..." }
}
```
- `q1_5`: đúng 5 câu. `scene` là 2–5 emoji ghép thành một cảnh dễ hiểu (người + hành động + đồ vật/nơi chốn). `words`: đúng 2 từ
  (danh từ/động từ/giới từ…) phải dùng trong câu; `samples`: 2 câu mẫu đúng ngữ pháp, chứa CẢ HAI từ (có thể chia dạng).
  `alt`: mô tả cảnh bằng tiếng Anh (hiện sau khi nộp). Độ khó tăng dần, câu 4–5 có giới từ / liên từ (because, while, before…).
- `q6_7`: đúng 2 email khác bối cảnh, mỗi email 60–120 từ; `task` nêu rõ số yêu cầu (2 câu hỏi, 1 đề nghị…).
- `q8`: câu hỏi nêu ý kiến (agree/disagree, chọn phương án…) bối cảnh công việc / đời sống.

---

## 2. Ngân hàng IELTS Writing — `server/src/data/writing-bank/ielts-task1.json`, `ielts-task2.json`
Mảng các đề:
```json
[
  { "id": "t1-01", "type": "bar", "title": "Tên ngắn tiếng Việt", "prompt": "The chart below ...",
    "chart": { "type": "bar", "title": "...", "unit": "%", "categories": ["..."], "series": [ { "name": "...", "values": [1, 2] } ] },
    "sample": "Bài mẫu ~180 từ", "sampleBand": 7.5, "notes_vi": "Dàn ý, câu tổng quan, lỗi hay gặp" }
]
```
- Task 1 `type` / `chart.type`: `bar`, `line`, `pie`, `table`, `process`.
  - `process`: `chart` = `{ "type": "process", "title": "...", "steps": [ { "label": "Harvesting", "detail": "tea leaves are picked by hand" } ] }`
    6–10 bước.
  - `pie`: mỗi series là một hình tròn (vd 2 năm so sánh), giá trị là %, tổng ≈ 100.
- Task 2 `type`: `opinion`, `discussion`, `problem-solution`, `advantages-disadvantages`, `two-part`; không có `chart`.
- Bài mẫu Task 1 ≥ 150 từ, Task 2 ≥ 250 từ; band mẫu 6.5–8.

---

## 3. Đề viết hằng ngày — `server/src/data/writing-bank/daily-<lang>.json` (lang = en, zh, ja)
```json
[
  { "id": "en-01", "level": "A2", "topic_vi": "Cuối tuần của bạn",
    "prompt": "Write about what you did last weekend.", "prompt_vi": "Viết về những gì bạn đã làm cuối tuần trước.",
    "min": 60, "useful": [ { "term": "go for a walk", "meaning_vi": "đi dạo" } ],
    "sample": "Đoạn mẫu bằng ngôn ngữ đích", "sample_vi": "Bản dịch tiếng Việt của đoạn mẫu" }
]
```
- `level`: en A1–C1; zh HSK1–HSK6; ja N5–N1. Phân bố đều các trình độ (mỗi trình độ ≥ 3 đề).
- `min`: số TỪ tối thiểu (tiếng Anh) hoặc số CHỮ tối thiểu (tiếng Trung / Nhật), hợp trình độ (vd A1 30 từ, C1 180 từ; HSK1 30 chữ, HSK6 300 chữ).
- `useful`: 4–8 từ/cụm từ hữu ích đúng trình độ (tiếng Trung kèm pinyin trong `term` dạng `"周末 (zhōumò)"`; tiếng Nhật kèm cách đọc `"週末 (しゅうまつ)"`).
- `sample`: đoạn mẫu tự nhiên, đúng trình độ, dài ≥ `min`; `sample_vi`: bản dịch.
- Chủ đề đời thường → học thuật theo trình độ (bản thân, gia đình, du lịch, công việc, công nghệ, môi trường, văn hoá…).
