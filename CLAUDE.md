# LinguaViet — ghi chú cho Claude

App học tiếng Anh / Trung / Nhật cho người Việt. Người dùng nói **tiếng Việt** — trả lời và viết giao diện bằng tiếng Việt. Xem thêm `README.md` (tính năng), `DEPLOY.md`, `DATA_LICENSES.md`.

## Kiến trúc
- Monorepo npm workspaces: `client/` (React 18 + Vite + react-router, PWA) và `server/` (Express + better-sqlite3 v12, JWT).
- Server phục vụ luôn `client/dist` khi `NODE_ENV=production` → **sửa chỉ phía client thì chỉ cần build lại, không cần restart server**.
- Client: `client/src/pages/` (mỗi trang một file; `games/`, `kids/` là thư mục con), `components/`, `lib/` (`api.js`, `speech.js`, `lang.jsx`, `srs.js`...), `data/` (dữ liệu tĩnh: `alphabet.js`, `kids.js`, `kana-strokes.json`). Route và menu khai báo trong `client/src/App.jsx`. CSS toàn cục trong `client/src/styles.css` (khu bé dùng class `kid-*`, `kids-wrap`).
- Server: `server/src/index.js` + các router (`words`, `exams`, `writing`, `grammar`, `games`, `gamify`, `push`). Dữ liệu từ vựng/đề/ngữ pháp trong `server/src/data/`, công cụ tạo dữ liệu trong `tools/`.
- Ngôn ngữ: `en`, `zh`, `ja` (JLPT N5–N1). Trình độ người dùng lưu theo từng ngôn ngữ (`PUT /api/me/level`).

## Chạy & kiểm thử
- Dev: `npm install && npm run dev` (client :5273, API :3101).
- Test server riêng: `API_PORT=3298 DB_PATH=<file tạm>.db node server/src/index.js` — biến môi trường là **`API_PORT`, không phải `PORT`**.
- Tạo user test: `POST /api/auth/register {email,name,password}`, đặt trình độ bằng `PUT /api/me/level {lang,level}`, token để trong `localStorage['langapp.token']`.
- Build client: `cd client && npx vite build`.
- Không có Python. Sửa file phức tạp: viết script `.cjs` rồi chạy bằng node (tránh `node -e` với nhiều loại dấu nháy trong bash).

## Production trên máy của người dùng
- Chạy từ `H:\LangApp` (nhánh `main`) bằng `scripts\start-server.ps1` (cổng 3201, dữ liệu ở `H:\LangApp\data`, không đưa lên git), công khai qua Tailscale Funnel `https://theduong.taild0b5c4.ts.net`. Node 24.
- Sau khi merge: `git -C H:\LangApp pull --ff-only origin main`, rồi build (`cd client && npx vite build`). Đổi phía server hoặc DB thì người dùng restart server bằng `start-server.ps1 -Build`.
- Đổi dữ liệu từ vựng: chạy `DB_PATH=H:/LangApp/data/langapp.db node server/src/seed.js` (server chỉ tự seed khi DB rỗng), tốt nhất lúc server đang dừng. Trước khi migrate DB: backup bằng `.backup()` của better-sqlite3.
- Người dùng test chủ yếu trên **iPhone Safari** → mọi thay đổi về mic/âm thanh phải tính tới quirk của WebKit.

## Git / PR
- Không có `gh`. Push nhánh rồi đưa **link compare GitHub** (`https://github.com/Duongfill/LinguaViet/compare/main...<nhánh>?expand=1`) để người dùng tự tạo và merge PR. Khi họ báo "đã merge", kiểm tra bằng `curl https://api.github.com/repos/Duongfill/LinguaViet/pulls/<n>` rồi pull + build ở `H:\LangApp`.
- Dùng `git add / commit / push` đơn giản; đừng gộp rebase + force-push thành một lệnh.
- Commit kết thúc bằng dòng `Co-Authored-By: Claude ... <noreply@anthropic.com>` theo hướng dẫn phiên.
- Làm việc trong worktree `.claude/worktrees/...`; thư mục chính là `H:\LangApp`.

## Quirk kỹ thuật cần nhớ
- **Nhận dạng giọng nói** (`client/src/lib/speech.js`, `pages/Speak.jsx`): WebKit cần `continuous`, cooldown sau TTS/phiên trước (`WEBKIT_COOLDOWN_MS`), watchdog bắt trường hợp mic mở mà không thu âm, giới hạn retry 3 lần. Chế độ thủ công (`listen(lang,{manual:true})`): người dùng bấm bật/tắt mic, tự khởi động lại khi trình duyệt tự dừng và nối các transcript.
- **TTS đọc chữ cái đơn**: "A" bị đọc thành "capital A" → dùng chuỗi đọc thay thế (`say`: ay, bee, see...) trong `data/alphabet.js`.
- **Nét chữ**: kana dùng SVG KanjiVG đóng gói sẵn (`kana-strokes.json`, hoạt ảnh bằng `pathLength` + `stroke-dashoffset`; giấy phép CC BY-SA 3.0 ghi trong `DATA_LICENSES.md`). Hán tự dùng HanziWriter, dữ liệu tải từ CDN → cần mạng.
- **Khu Bé học** (`/kids`, dưới 5 tuổi): hoàn toàn phía client, không đụng server; sao lưu ở `localStorage` (`langapp.kids.stars.<lang>`); âm thanh tổng hợp bằng WebAudio; từ vựng bằng emoji (`data/kids.js`); sai không bị phạt; giao diện luôn nền sáng bất kể theme.

## Ngữ pháp trực quan
- Mẹo nhớ + emoji + kiểu dòng thời gian của từng bài nằm ở `server/src/data/grammar/tips-<lang>.json` (khoá = id bài; server gộp vào bài khi nạp → **đổi file này cần restart server**). `timeline` chỉ nhận các giá trị trong `components/GrammarKit.jsx` (habit, past-result, future-near...).
- `GrammarKit.jsx`: tách công thức thành khối màu theo vai trò (đoán bằng regex từ chuỗi `formula`), tô sáng từ cố định trong ví dụ, vẽ dòng thời gian SVG, tìm lỗi sai bằng LCS.
- Thẻ ôn SM-2 theo bài: bảng `grammar_srs`, API `/grammar/review` (GET đến hạn, POST chấm, `/add`); bài tự vào thẻ khi làm bài tập; trang `/grammar/review` ghép ngẫu nhiên 3 dạng (công thức / bài nhỏ / sửa câu sai).

## Tính năng đã có
Flashcard + SRS (SM-2), Quiz, Luyện phát âm, Luyện chữ Hán, Trò chơi từ vựng (Mưa từ, Đúng/Sai, Xếp chữ, Ghép thẻ), Chính tả, Dịch, Ngữ pháp (200 bài), Luyện viết, Đề TOEIC/IELTS, Lộ trình (Journey), Từ hay quên, Tìm từ, Bảng chữ cái & cách viết (Anh/Nhật/Trung), Bé học (xem hình & nghe, chọn đúng hình, bắn bóng bay), bảng xếp hạng, thông báo đẩy.

## Ý tưởng chưa làm
Bài hát ABC cho bé, hoạt ảnh nét viết chữ cái Latinh, đồng bộ sao của bé theo tài khoản (hiện chỉ lưu trên thiết bị).
