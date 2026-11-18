# Đặc tả đề luyện TOEIC / IELTS

Đề là **nội dung mới tự soạn theo đúng dạng thức** TOEIC / IELTS — KHÔNG chép đề thật của ETS, British Council, IDP, Cambridge
hay sách luyện thi có bản quyền. Không dùng tên công ty / người nổi tiếng có thật trong tình huống tiêu cực.

Mỗi đề là một thư mục `server/src/data/exams/<id>/` (vd `toeic-01`, `ielts-02`) gồm nhiều file JSON nhỏ (UTF-8, JSON hợp lệ,
không comment). Kiểm tra: `node tools/exams/check.mjs server/src/data/exams/<id> [tên-file ...]` → phải in `OK`.

Quy ước chung cho mọi câu hỏi:
- `explain`: giải thích **tiếng Việt** 1–2 câu: vì sao đáp án đúng (trích chỗ trong bài/lời nói nếu có), vì sao bẫy sai.
- Đáp án trắc nghiệm `answer` là **chỉ số bắt đầu từ 0** trong `options`. Phân bố đáp án đúng đều giữa A/B/C/D, không theo quy luật.
- Lời thoại nghe: mảng `audio` các dòng `{ "s": "<người nói>", "t": "<câu nói tiếng Anh>" }`.
  `s` ∈ `M` (nam), `W` (nữ), `M2` (nam thứ hai), `W2` (nữ thứ hai), `N` (người dẫn / thông báo).
  Viết lời nói tự nhiên như người thật (có "Well,", "Actually,", sửa ý…), mỗi dòng ≤ 2 câu.

---

## TOEIC (thư mục `toeic-XX`)

| File | Phần | Nhóm × câu | Ghi chú |
|---|---|---|---|
| `p2.json` | Part 2 Question–Response | 25 nhóm × 1 câu | `audio` = 1 dòng câu hỏi/câu nói; `options` = **3** câu đáp (người nói khác giới đọc). Không có `q`. |
| `p3.json` | Part 3 Conversations | 13 nhóm × 3 câu | `audio` hội thoại 2–3 người, 6–10 dòng; ít nhất 3 nhóm có 3 người (M, W, M2…). Câu hỏi có `q` + 4 `options`. |
| `p4.json` | Part 4 Talks | 10 nhóm × 3 câu | `audio` 1 người nói (thông báo, tin nhắn thoại, quảng cáo, hướng dẫn, bản tin), 5–9 dòng. `kind`: loại bài nói. |
| `p5.json` | Part 5 Incomplete Sentences | 30 nhóm × 1 câu | `q` chứa đúng một chỗ trống `______`; 4 `options` (ngữ pháp: từ loại, thì, giới từ, liên từ…; từ vựng). |
| `p6.json` | Part 6 Text Completion | 4 nhóm × 4 câu | `passages` 1 văn bản chứa `[1]` `[2]` `[3]` `[4]` đúng thứ tự câu hỏi. Mỗi nhóm có đúng 1 câu chèn **cả câu** (options là 4 câu hoàn chỉnh). Không có `q`. |
| `p7.json` | Part 7 Reading Comprehension | 10 nhóm đơn (2–4 câu, tổng 29) + 2 nhóm đôi (5 câu) + 3 nhóm ba (5 câu) = 54 câu | `passages` 1, 2 hoặc 3 văn bản. Có câu hỏi "NOT true", suy luận, từ đồng nghĩa ("The word X in paragraph 1… is closest in meaning to"), và câu liên kết thông tin giữa các văn bản. |

Mỗi file:
```json
{
  "part": 7,
  "groups": [
    {
      "kind": "email",
      "passages": [ { "kind": "email", "title": "Email", "text": "To: ...\nFrom: ...\nSubject: ...\n\nDear Ms. Lee, ..." } ],
      "audio": [ { "s": "W", "t": "..." } ],
      "questions": [
        { "q": "What is the purpose of the e-mail?", "options": ["...", "...", "...", "..."], "answer": 2, "explain": "..." }
      ]
    }
  ]
}
```
- `passages` chỉ dùng cho Part 6–7; `audio` chỉ cho Part 2–4. `kind` của passage: email, letter, memo, notice, advertisement,
  article, webpage, form, invoice, schedule, chat, review, announcement.
- Văn bản Part 7: 80–300 từ mỗi văn bản, thực tế (có tiêu đề, ngày, tên người/công ty hư cấu). Dòng mới dùng `\n`.
- Độ khó phân bố như đề thật (khoảng 30% dễ, 50% trung bình, 20% khó). Bối cảnh công sở, du lịch, mua sắm, sự kiện, y tế, nhà hàng…

---

## IELTS Academic (thư mục `ielts-XX`)

### Reading: `reading-1.json`, `reading-2.json`, `reading-3.json`
Mỗi bài 700–950 từ, văn phong học thuật phổ thông, chia đoạn có nhãn A, B, C…; số câu: 13, 13, 14 (tổng 40), độ khó tăng dần.
```json
{
  "title": "The Rise of Urban Beekeeping",
  "paragraphs": [ { "label": "A", "text": "..." } ],
  "blocks": [
    { "type": "tfng", "instructions": "Do the following statements agree with the information given in Reading Passage 1? Write TRUE, FALSE or NOT GIVEN.",
      "questions": [ { "q": "...", "answer": "NOT GIVEN", "explain": "..." } ] },
    { "type": "headings", "instructions": "Choose the correct heading for each paragraph from the list of headings below.",
      "options": ["i  ...", "ii  ...", "..."],
      "questions": [ { "q": "Paragraph B", "answer": 3, "explain": "..." } ] },
    { "type": "mcq", "instructions": "Choose the correct letter, A, B, C or D.",
      "questions": [ { "q": "...", "options": ["...", "...", "...", "..."], "answer": 1, "explain": "..." } ] },
    { "type": "gap", "instructions": "Complete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
      "questions": [ { "q": "Bees were first kept on city rooftops in ______.", "answer": ["the 1980s", "1980s"], "explain": "..." } ] },
    { "type": "match", "instructions": "Match each statement with the correct researcher, A–E.",
      "options": ["A  ...", "B  ...", "..."],
      "questions": [ { "q": "...", "answer": 0, "explain": "..." } ] }
  ]
}
```
- `type`: `tfng` (TRUE/FALSE/NOT GIVEN), `ynng` (YES/NO/NOT GIVEN — ý kiến tác giả), `mcq`, `gap`, `headings`, `match`.
- `gap`: `q` có đúng một `______`; `answer` là MẢNG các cách viết chấp nhận được (lấy nguyên văn từ bài, đúng giới hạn số từ ghi trong `instructions`).
- `headings` / `match`: `options` dùng chung cho cả khối (headings nhiều hơn số đoạn 2–3 cái); `answer` là chỉ số trong `options`.
- Mỗi bài có 2–3 khối thuộc ít nhất 2 loại khác nhau; cả đề có đủ `tfng` hoặc `ynng`, `headings`, `mcq`, `gap`.

### Listening: `listening-1.json` … `listening-4.json` (mỗi phần 10 câu, tổng 40)
- Phần 1: hội thoại đời thường 2 người (đặt chỗ, đăng ký, hỏi thông tin) — chủ yếu `gap` điền form/ghi chú (tên, số, ngày…).
- Phần 2: độc thoại bối cảnh xã hội (giới thiệu nơi chốn, sự kiện) — `mcq`, `match`, `gap`.
- Phần 3: hội thoại học thuật 2–3 người (sinh viên, giảng viên) — `mcq`, `match`.
- Phần 4: bài giảng học thuật — `gap` điền ghi chú.
```json
{ "title": "Section 1", "context": "A man is phoning a sports centre to book a course.",
  "audio": [ { "s": "W", "t": "..." } ],
  "blocks": [ { "type": "gap", "instructions": "Complete the form below. Write ONE WORD AND/OR A NUMBER for each answer.",
                "questions": [ { "q": "Surname: ______", "answer": ["Blackwell"], "explain": "..." } ] } ] }
```
- Lời nói phải chứa đáp án theo đúng thứ tự câu hỏi, có bẫy (nói sai rồi sửa, đánh vần tên, đổi ngày…). 25–45 dòng mỗi phần.
- Đánh vần tên viết dạng `"B-L-A-C-K-W-E-L-L"`; số viết bằng chữ số.

### Writing: `writing.json`
```json
{
  "task1": {
    "prompt": "The chart below shows ... Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    "chart": { "type": "bar", "title": "...", "unit": "%", "categories": ["2000", "2010", "2020"],
               "series": [ { "name": "Car", "values": [45, 52, 38] } ] },
    "sample": "Bài mẫu tiếng Anh ~180 từ", "sampleBand": 7.5,
    "notes_vi": "Gợi ý dàn ý / lỗi hay gặp bằng tiếng Việt"
  },
  "task2": { "prompt": "...", "sample": "Bài mẫu ~280 từ", "sampleBand": 7.5, "notes_vi": "..." }
}
```
- `chart.type`: `bar`, `line`, `pie` (1 series, giá trị là %), `table`. 2–5 series, 3–8 categories, số liệu hợp lý.

### Speaking: `speaking.json`
```json
{
  "part1": { "topic": "Hometown", "questions": ["...", "..."], "samples": ["...", "..."] },
  "part2": { "cue": "Describe a ...", "bullets": ["what it was", "when ...", "who ...", "and explain ..."], "sample": "..." },
  "part3": { "questions": ["...", "..."], "samples": ["...", "..."] },
  "vocab_vi": [ { "en": "a cherished memory", "vi": "kỷ niệm đáng trân trọng" } ]
}
```
- Part 1: 4–5 câu; Part 3: 4–5 câu liên quan chủ đề Part 2; bài mẫu band ~7.5, tự nhiên, Part 2 khoảng 250–300 từ.
