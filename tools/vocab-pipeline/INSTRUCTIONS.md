# Nhiệm vụ: soạn thẻ từ vựng cho app học tiếng Anh / tiếng Trung dành cho người Việt

Mỗi file đầu vào `in/<name>.json` là mảng 100 từ. Với MỖI file được giao, tạo file `out/<name>.jsonl`
(cùng tên, đuôi `.jsonl`), mỗi dòng là MỘT object JSON cho MỘT từ đầu vào, giữ đúng thứ tự, đủ 100 dòng.

## Các trường mỗi dòng
| trường | yêu cầu |
|---|---|
| `id` | giữ nguyên id đầu vào |
| `meaning_vi` | nghĩa tiếng Việt ngắn gọn, chuẩn, 1–3 nghĩa phổ biến nhất ngăn bởi `; `. Viết thường (trừ tên riêng). Tối đa ~40 ký tự. Với tiếng Trung, `gloss_en` chỉ là gợi ý — dịch theo nghĩa thông dụng nhất trong tiếng Trung hiện đại. Với từ đa từ loại (pos) chọn nghĩa thông dụng, có thể ghi `(v)`/`(n)` nếu cần phân biệt. |
| `example` | 1 câu ví dụ tự nhiên, ngắn, đúng trình độ (`level`), CHỨA chính từ đó. Tiếng Anh: ≤ 14 từ, có thể chia động từ/số nhiều. Tiếng Trung: chữ giản thể, ≤ 20 chữ, dấu câu toàn khổ `。？！，`. |
| `example_vi` | dịch câu ví dụ sang tiếng Việt tự nhiên |
| `topic` | đúng MỘT khoá trong danh sách chủ đề bên dưới |
| `phonetic` | CHỈ thêm khi đầu vào `phonetic` rỗng hoặc sai rõ ràng (vd từ "a" bị ghi /ˈeɪ/ → /ə/). Tiếng Anh: IPA Mỹ trong `/.../`; tiếng Trung: pinyin có dấu thanh. Nếu đầu vào đúng thì BỎ trường này. |

## Lưu ý riêng tiếng Trung
Dữ liệu nguồn HSK đôi khi sai: `gloss_en` có thể là nghĩa họ/dị thể/hiếm, `phonetic` có thể là âm đọc hiếm
(vd 行 ghi háng nhưng nghĩa thông dụng là xíng "được, đi"; 告诉 nên là gàosu, 妻子 là qīzi).
Luôn chọn nghĩa và âm đọc THÔNG DỤNG NHẤT của từ trong tiếng phổ thông hiện đại; nếu khác đầu vào thì thêm trường `phonetic`
(pinyin có dấu thanh, thanh nhẹ không dấu, các âm tiết của một từ viết liền như `gàosu`, `xǐhuan`).

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
- `time_quantity` — thời gian, số, đo lường, vị trí, không gian
- `communication` — giao tiếp, ngôn ngữ, ý kiến
- `technology` — công nghệ, máy móc, truyền thông
- `money` — mua sắm, tiền bạc, tài chính
- `actions` — động từ hành động chung không thuộc chủ đề trên
- `qualities` — tính từ/trạng từ miêu tả chung không thuộc chủ đề trên
- `abstract` — danh từ trừu tượng chung (vấn đề, cách, kết quả…)
- `function` — từ chức năng: đại từ, giới từ, liên từ, mạo từ, trợ từ, lượng từ, phó từ ngữ pháp, thán từ

## Cách làm
1. Đọc `in/<name>.json`.
2. Viết toàn bộ file `out/<name>.jsonl` bằng công cụ Write (một lần, 100 dòng). JSON hợp lệ, KHÔNG có dòng thừa/markdown.
3. Chạy `node check.mjs <name>` trong thư mục này. Nếu báo lỗi, sửa và chạy lại tới khi in `OK`.
4. Chuyển sang file kế tiếp. Không sửa file ngoài `out/`.

Ví dụ một dòng:
{"id":4714,"meaning_vi":"gọi điện thoại","example":"晚上我给妈妈打电话。","example_vi":"Buổi tối tôi gọi điện cho mẹ.","topic":"communication"}
