# Nhiệm vụ: soạn thẻ từ vựng tiếng Nhật (JLPT) cho người Việt

Mỗi file đầu vào `<WORK>/in/<name>.json` là mảng tối đa 100 từ, mỗi từ có:
`id`, `level` (N5…N1), `term` (cách viết), `phonetic` (cách đọc kana), `gloss_en` (nghĩa tiếng Anh — CHỈ là gợi ý).

Với MỖI file được giao, tạo `<WORK>/out/<name>.jsonl` (cùng tên, đuôi `.jsonl`): mỗi dòng là MỘT object JSON
cho MỘT từ đầu vào, giữ đúng thứ tự, đủ số dòng bằng số từ đầu vào.

## Các trường mỗi dòng
| trường | yêu cầu |
|---|---|
| `id` | giữ nguyên id đầu vào |
| `meaning_vi` | nghĩa tiếng Việt ngắn gọn, chuẩn, 1–3 nghĩa phổ biến nhất ngăn bởi `; `. Viết thường (trừ tên riêng). Tối đa ~40 ký tự (bắt buộc ≤ 60). Dịch theo nghĩa thông dụng nhất trong tiếng Nhật hiện đại, không dịch máy móc `gloss_en`. Có thể thêm `(v)`, `(n)`, `(adj)`, `(kính ngữ)`… nếu cần phân biệt. Từ có Hán Việt rõ ràng thì có thể ghi kèm, vd `勉強` → `học, học tập`. |
| `example` | 1 câu ví dụ tiếng Nhật tự nhiên, ngắn (≤ 25 ký tự), đúng trình độ `level`, CHỨA chính từ đó (được phép chia động từ/tính từ: 会う → 会いました). Dùng dấu câu Nhật `。？！、`. KHÔNG có chữ Latin. Với N5–N4, chữ Hán khó ngoài trình độ thì viết bằng hiragana. Từ dạng phụ tố có `～` (vd `～円`) thì ví dụ dùng cả cụm (vd `百円です。`). |
| `example_vi` | dịch câu ví dụ sang tiếng Việt tự nhiên |
| `topic` | đúng MỘT khoá trong danh sách chủ đề bên dưới |
| `phonetic` | CHỈ thêm khi cách đọc đầu vào sai rõ ràng hoặc không phải cách đọc thông dụng. Chỉ viết bằng kana (hiragana; từ ngoại lai dùng katakana). Nếu đầu vào đúng thì BỎ trường này. |

## Danh sách chủ đề (`topic`)
- `people` — con người, gia đình, quan hệ
- `body_health` — cơ thể, sức khoẻ, y tế
- `food` — ăn uống, nấu nướng
- `home` — nhà cửa, đồ dùng, quần áo
- `work` — công việc, kinh doanh, kinh tế
- `education` — giáo dục, khoa học, học thuật
- `nature` — thiên nhiên, động vật, thời tiết, môi trường
- `travel` — du lịch, giao thông, địa điểm
- `society` — xã hội, chính trị, pháp luật, quân sự
- `culture` — văn hoá, nghệ thuật, thể thao, giải trí
- `feelings` — cảm xúc, tính cách, thái độ
- `time_quantity` — thời gian, số, đo lường, vị trí, không gian, trợ số từ
- `communication` — giao tiếp, ngôn ngữ, ý kiến, chào hỏi
- `technology` — công nghệ, máy móc, truyền thông
- `money` — mua sắm, tiền bạc, tài chính
- `actions` — động từ hành động chung không thuộc chủ đề trên
- `qualities` — tính từ/trạng từ miêu tả chung không thuộc chủ đề trên
- `abstract` — danh từ trừu tượng chung (vấn đề, cách, kết quả…)
- `function` — từ chức năng: đại từ, trợ từ, liên từ, phó từ ngữ pháp, thán từ, phụ tố

## Cách làm
1. Đọc `<WORK>/in/<name>.json`.
2. Viết toàn bộ file `<WORK>/out/<name>.jsonl` bằng công cụ Write (một lần). JSON hợp lệ, mỗi object một dòng, KHÔNG có dòng thừa/markdown.
3. Chạy `node <REPO>/tools/vocab-pipeline/ja.mjs check <WORK> <name>`. Nếu báo lỗi, sửa đúng các dòng lỗi và chạy lại tới khi in `OK`.
4. Chuyển sang file kế tiếp. Không sửa file nào ngoài `<WORK>/out/`.

Ví dụ một dòng:
{"id":2,"meaning_vi":"gặp, gặp gỡ","example":"駅で友達に会いました。","example_vi":"Tôi đã gặp bạn ở nhà ga.","topic":"people"}
