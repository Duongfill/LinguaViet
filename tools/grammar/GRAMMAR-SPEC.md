# Đặc tả bài học ngữ pháp

Nội dung **tự soạn** cho người Việt học (giải thích bằng tiếng Việt, dễ hiểu, so sánh với tiếng Việt khi hữu ích).
Không chép sách giáo trình có bản quyền (Grammar in Use, Minna no Nihongo, 标准教程…).

File: `server/src/data/grammar/<lang>/<LEVEL>.json` (vd `en/A1.json`, `zh/HSK3.json`, `ja/N5.json`) — một MẢNG các điểm ngữ pháp,
đúng thứ tự trong danh sách chủ điểm bên dưới. Kiểm tra: `node tools/grammar/check.mjs <file>` → phải in `OK`.

```json
[
  {
    "id": "en-a1-present-simple",
    "level": "A1",
    "title": "Thì hiện tại đơn",
    "title_native": "Present simple",
    "summary_vi": "Diễn tả thói quen, sự thật, lịch trình.",
    "formula": ["S + V(s/es)", "S + do/does + not + V", "Do/Does + S + V?"],
    "explain_vi": "Đoạn giải thích 120–300 từ tiếng Việt. Xuống dòng bằng \n\n. Có thể dùng **in đậm**.",
    "examples": [ { "t": "She works in a bank.", "vi": "Cô ấy làm việc ở ngân hàng." } ],
    "mistakes": [ { "wrong": "She work in a bank.", "right": "She works in a bank.", "note_vi": "Ngôi thứ ba số ít phải thêm -s." } ],
    "exercises": [
      { "type": "mcq", "q": "He ___ to school every day.", "options": ["go", "goes", "going", "gone"], "answer": 1, "explain": "…" },
      { "type": "gap", "q": "They ___ coffee. (not / like)", "answer": ["don't like", "do not like"], "explain": "…" },
      { "type": "order", "words": ["reads", "every", "She", "morning"], "answer": "She reads every morning.", "vi": "Cô ấy đọc mỗi sáng.", "explain": "…" }
    ]
  }
]
```

Quy định:
- `id`: `<lang>-<level viết thường>-<slug>` duy nhất. `level` đúng tên file.
- `title`: tên tiếng Việt ngắn; `title_native`: tên/mẫu bằng ngôn ngữ đích (vd `把字句`, `〜てから`, `Present perfect`).
- `formula`: 1–4 dòng công thức/cấu trúc.
- `examples`: 4–6 câu, đúng trình độ, tự nhiên.
  - Tiếng Trung: thêm `"py"` (pinyin có dấu thanh) cho mỗi câu.
  - Tiếng Nhật: thêm `"r"` (cách đọc toàn câu bằng hiragana) cho mỗi câu.
- `mistakes`: 1–3 lỗi người Việt hay mắc.
- `exercises`: 8–10 bài, ít nhất 3 `mcq`, 2 `gap`, 2 `order`; độ khó tăng dần; `explain` tiếng Việt ngắn gọn.
  - `mcq`: `q` có `___`; 4 `options`; `answer` là chỉ số 0–3, phân bố đều.
  - `gap`: `q` có đúng một `___` (gợi ý trong ngoặc ở cuối câu nếu cần); `answer` là MẢNG các đáp án đúng.
  - `order`: `words` là các mảnh đã xáo trộn (tiếng Anh: từng từ, giữ hoa/thường như trong câu đúng, bỏ dấu câu cuối;
    tiếng Trung/Nhật: các cụm từ 1–4 chữ); `answer` là câu đúng (có dấu câu); `vi` là nghĩa tiếng Việt.
    Ghép các mảnh theo đúng thứ tự phải ra `answer` (bỏ qua dấu câu, khoảng trắng, hoa thường).
- Bài tập phải kiểm tra đúng điểm ngữ pháp của bài, không đánh đố từ vựng ngoài trình độ.

---

## Danh sách chủ điểm (theo thứ tự trong file)

### Tiếng Anh (`en`)
- **A1** (14): to be (am/is/are) · present simple · present continuous · there is/there are · a/an/the · danh từ số nhiều · this/that/these/those · tính từ sở hữu & 's · can/can't · câu mệnh lệnh · giới từ nơi chốn (in/on/at/under/next to) · giới từ thời gian (in/on/at) · từ để hỏi (wh-questions) · đại từ tân ngữ
- **A2** (14): past simple · past continuous · present perfect (ever/never/just/already/yet) · will vs be going to · so sánh hơn · so sánh nhất · danh từ đếm được/không đếm được + some/any/much/many/a lot of · trạng từ tần suất · trạng từ cách thức · must/have to/should · like/love/hate + V-ing · too/enough · want to vs enjoy V-ing · câu điều kiện loại 1
- **B1** (14): present perfect vs past simple · present perfect continuous · past perfect · used to/would · câu điều kiện loại 2 · bị động (hiện tại/quá khứ đơn) · mệnh đề quan hệ xác định · câu tường thuật (câu kể) · must/might/can't (suy đoán) · câu hỏi đuôi · so/such … that · stop/remember/try + to V / V-ing · câu hỏi gián tiếp · future continuous
- **B2** (12): câu điều kiện loại 3 & hỗn hợp · bị động mọi thì & have something done · câu tường thuật (câu hỏi, mệnh lệnh) · mệnh đề quan hệ không xác định · wish/if only · should have/could have/must have · mệnh đề phân từ · future perfect · liên từ đối lập (although/despite/however/whereas) · each/every/either/neither/both/none · mạo từ nâng cao · hình thức nhấn mạnh với do/does/did
- **C1** (8): đảo ngữ (Never have I…, Not only…) · câu chẻ (It is… that / What…) · thể giả định (It is essential that he be…) · bị động khách quan (It is said that / He is said to) · tỉnh lược & thay thế (so/not/do so) · danh từ hoá · rào đón (hedging: tend to, it appears that) · đảo trật tự nhấn mạnh (fronting)

### Tiếng Trung (`zh`)
- **HSK1** (10): 是 · 的 (sở hữu) · 吗 · 呢 · 不/没 · 有 · số đếm + lượng từ 个 · 很 + tính từ · từ để hỏi 什么/谁/哪儿/几/多少 · 在 (nơi chốn)
- **HSK2** (10): 了 (hoàn thành) · 过 (kinh nghiệm) · 正在…呢 · 比 (so sánh) · 要/想/会/能/可以 · 因为…所以… · 虽然…但是… · 还是 vs 或者 · 就 vs 才 · bổ ngữ trạng thái V得…
- **HSK3** (12): 把 · 被 · bổ ngữ kết quả (完/到/懂/好) · bổ ngữ xu hướng (来/去/上来/下去…) · bổ ngữ khả năng (V得了/V不了) · 越来越 / 越…越… · 一边…一边… · 先…然后/再… · 除了…以外 · 只要…就… · 如果…就… · 又…又…
- **HSK4** (12): 不但…而且… · 即使…也… · 无论…都… · 既然…就… · 连…都/也… · 只有…才… · 由于 · 以…为… · 不管…都… · 尽管…还是… · 甚至 · câu hỏi tu từ (难道…吗 / 不是…吗)
- **HSK5** (10): 宁可…也不… · 与其…不如… · 何况 · 以免/免得 · 未必 · 毕竟 · 果然 vs 竟然 · 恨不得 · 难免 · 之所以…是因为…
- **HSK6** (8): 固然 · 况且 · 以至于 · 鉴于 · 不免 · 势必 · 可见 · 倘若/一旦…就…

### Tiếng Nhật (`ja`)
- **N5** (18): は vs が · を/に/で/へ · の · も/と/や · です/でした & phủ định · tính từ い/な & chia · nhóm động từ & thể ます · thể て (cách chia) · 〜ています · 〜たい · 〜ませんか/〜ましょう · 〜てください/〜ないでください · 〜から (vì) · あります/います · 〜たことがある · so sánh より/ほうが · 〜前に/〜後で · từ để hỏi + か/も
- **N4** (16): thể thường (từ điển/ない/た) · thể khả năng · thể ý chí + と思う · 〜ば · 〜たら · 〜と (điều kiện) · 〜なら · thể bị động · thể sai khiến · 〜てしまう · 〜ておく · 〜てみる · 〜そうだ (trông có vẻ / nghe nói) · 〜ようだ/〜みたい · あげる/くれる/もらう · 〜ながら
- **N3** (16): 〜ようにする/〜ようになる · 〜ために · 〜ことにする/〜ことになる · 〜はずだ · 〜わけだ · 〜らしい · 〜ばかり · 〜ところだ · 〜うちに · 〜によって · 〜として · 〜について/〜に対して · 〜ても · thể bị động sai khiến · 〜とおり · kính ngữ cơ bản (尊敬語・謙譲語)
- **N2** (14): 〜わけにはいかない · 〜に違いない · 〜おかげで/〜せいで · 〜一方だ · 〜つつある · 〜ものだ · 〜ことはない · 〜に関して · 〜を通じて · 〜からこそ · 〜ばかりか · 〜どころか · 〜にしては · 〜っぽい
- **N1** (12): 〜をもって · 〜んばかり · 〜ながらも · 〜といえども · 〜をよそに · 〜ともなると · 〜べく · 〜にたえない · 〜ならでは · 〜を禁じ得ない · 〜まじき · 〜たりとも
