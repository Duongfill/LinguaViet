# Triển khai LinguaViet lên mạng (HTTPS)

Điện thoại chỉ cài được app (PWA) và nhận thông báo khi app chạy trên **HTTPS**. Có 3 cách:

| Cách | Hợp với | Chi phí | Độ khó |
|---|---|---|---|
| **A. Cloudflare Tunnel từ máy này** | Thử trên điện thoại ngay hôm nay | Miễn phí | Dễ — nhưng máy tính phải luôn bật |
| **B. VPS Ubuntu + Nginx** *(khuyên dùng lâu dài)* | Dùng thật, nhiều người | ~100–150k đ/tháng + tên miền | Trung bình |
| **C. Railway / Fly.io (Docker)** | Không muốn tự quản server | ~5 USD/tháng | Dễ |
| **D. Render** (nếu đã có tài khoản) | Không muốn tự quản server | ~7–8 USD/tháng (Starter + ổ đĩa 1 GB; giá tham khảo, xem trang giá Render) | Dễ |

## Biến môi trường (dùng chung cho mọi cách)

| Biến | Ý nghĩa |
|---|---|
| `NODE_ENV=production` | Bắt buộc. Thiếu `JWT_SECRET` thì server sẽ từ chối chạy. |
| `JWT_SECRET` | Chuỗi bí mật ký phiên đăng nhập. Tạo: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `API_PORT` / `PORT` | Cổng server (mặc định 3101). Ở production server cũng nhận `PORT` do nền tảng cấp (Render, Railway…). |
| `DB_PATH` | Đường dẫn file DB. Cùng thư mục sẽ có `vapid.json` (khoá thông báo). **Sao lưu cả thư mục này.** |
| `VAPID_SUBJECT` | `mailto:email-cua-ban` — liên hệ gửi kèm thông báo đẩy. |

Lần chạy đầu với DB trống, server tự tạo bảng và nạp 10.015 từ. Muốn giữ tài khoản/tiến độ hiện có thì chép
`server/langapp.db` (và `server/vapid.json`) sang thư mục `DB_PATH` — lưu ý DB dev có tài khoản thử `test@langapp.test`, nên xoá hoặc bắt đầu DB mới.

---

## A. Cloudflare Tunnel (thử nhanh trên điện thoại)

Chạy trên chính máy Windows này, PowerShell:

```powershell
winget install --id Cloudflare.cloudflared
cd H:\LangApp
npm run build
$env:NODE_ENV="production"; $env:JWT_SECRET="<chuỗi bí mật>"; $env:VAPID_SUBJECT="mailto:<email>"; npm start
```

Mở cửa sổ PowerShell thứ hai:

```powershell
cloudflared tunnel --url http://localhost:3101
```

Lệnh in ra địa chỉ dạng `https://xxxx.trycloudflare.com` → mở trên điện thoại.

⚠️ Địa chỉ đổi mỗi lần chạy lại tunnel (thông báo đẩy gắn với địa chỉ, nên phải bật lại), và máy tính phải luôn bật.
Muốn địa chỉ cố định: dùng *named tunnel* với tên miền của bạn trên Cloudflare (`cloudflared tunnel login`, `cloudflared tunnel create`, `cloudflared tunnel route dns`).

---

## B. VPS Ubuntu 22.04/24.04 + Nginx + Let's Encrypt

**0. Chuẩn bị:** một VPS (Vultr, DigitalOcean, Viettel IDC…) và tên miền. Tạo bản ghi DNS **A** `hoc.example.com` → IP của VPS.

**1. Cài phần mềm**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git build-essential sqlite3 certbot python3-certbot-nginx
sudo useradd --system --create-home --shell /usr/sbin/nologin langapp
sudo mkdir -p /opt/langapp /var/lib/langapp && sudo chown langapp: /opt/langapp /var/lib/langapp
```

**2. Đưa code lên** (qua git, hoặc chép thư mục `H:\LangApp` trừ `node_modules`, `*.db`)
```bash
sudo -u langapp git clone <địa-chỉ-repo> /opt/langapp
cd /opt/langapp && sudo -u langapp npm ci && sudo -u langapp npm run build
```

**3. Biến môi trường + dịch vụ** (file mẫu trong thư mục `deploy/`)
```bash
sudo cp deploy/langapp.env.example /etc/langapp.env && sudo nano /etc/langapp.env   # sửa JWT_SECRET, VAPID_SUBJECT
sudo chmod 600 /etc/langapp.env
sudo cp deploy/langapp.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now langapp
sudo systemctl status langapp      # phải thấy "LangApp API chạy tại ..."
```

**4. Nginx + HTTPS**
```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/langapp && sudo nano /etc/nginx/sites-available/langapp  # đổi tên miền
sudo ln -s /etc/nginx/sites-available/langapp /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d hoc.example.com
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
```

**5. Sao lưu hằng ngày** (`sudo crontab -e`):
```
0 3 * * * sqlite3 /var/lib/langapp/langapp.db ".backup '/var/backups/langapp-$(date +\%F).db'" && cp /var/lib/langapp/vapid.json /var/backups/
```

**Cập nhật phiên bản mới:**
```bash
cd /opt/langapp && sudo -u langapp git pull && sudo -u langapp npm ci && sudo -u langapp npm run build && sudo systemctl restart langapp
```

---

## C. Railway / Fly.io (Docker)

Repo có sẵn `Dockerfile` (dữ liệu nằm ở `/data`). *Dockerfile chưa được chạy thử trên máy này vì máy chưa cài Docker.*

**Railway:** New Project → Deploy from GitHub repo → thêm **Volume** gắn vào `/data` →
Variables: `JWT_SECRET`, `VAPID_SUBJECT` → Settings › Networking: *Generate Domain*, target port **3101**. HTTPS có sẵn.

**Fly.io:** `fly launch` (chọn dùng Dockerfile, internal port 3101) → `fly volumes create data --size 1` và thêm vào `fly.toml`:
```toml
[mounts]
  source = "data"
  destination = "/data"
```
→ `fly secrets set JWT_SECRET=... VAPID_SUBJECT=mailto:...` → `fly deploy`.

⚠️ Không dùng gói không có ổ đĩa lưu trữ (ví dụ Render free): mỗi lần deploy lại sẽ mất DB.

---

## D. Render

**Vì sao không dùng gói Free được:**
- Ổ đĩa của gói Free bị xoá mỗi lần deploy/khởi động lại → mất DB (tài khoản, tiến độ) và khoá thông báo.
- Gói Free ngủ sau ~15 phút không có người vào → lịch nhắc học (chạy trong server) không gửi được, lần mở đầu chờ ~1 phút.

→ Cần **gói Starter** + **Persistent Disk** (chỉ gắn được vào gói trả phí). Repo có sẵn `render.yaml`.

**Cách 1 — Blueprint (nhanh nhất):**
1. Đưa code lên GitHub/GitLab (Render chỉ lấy code từ repo git).
2. Render Dashboard → **New → Blueprint** → chọn repo → Render đọc `render.yaml`:
   tạo web service Docker gói Starter, ổ đĩa 1 GB gắn ở `/data`, tự sinh `JWT_SECRET`, hỏi bạn nhập `VAPID_SUBJECT`.
3. Bấm **Apply** → chờ build xong → mở địa chỉ `https://linguaviet-xxxx.onrender.com` (HTTPS có sẵn).

**Cách 2 — Tạo tay:** New → **Web Service** → chọn repo → Runtime **Docker** → Instance type **Starter** →
Advanced: **Add Disk** (Mount path `/data`, 1 GB), Health check path `/api/health` →
Environment: `NODE_ENV=production`, `JWT_SECRET=<chuỗi ngẫu nhiên>`, `VAPID_SUBJECT=mailto:<email>`.
(Không cần đặt cổng: Render cấp `PORT`, server tự nhận.)

**Lưu ý:** khi có ổ đĩa, Render không deploy không-gián-đoạn (mỗi lần deploy app tắt vài giây) và chỉ chạy 1 instance — đủ cho app này.
Sao lưu: Render tự chụp snapshot ổ đĩa hằng ngày. Muốn tự tạo bản sao thì vào tab **Shell** của service và chạy:
`node -e "require('better-sqlite3')('/data/langapp.db').backup('/data/backup.db')"`.
Có thể gắn tên miền riêng trong Settings › Custom Domains.

---

## Sau khi lên mạng — bật trên điện thoại

1. Mở địa chỉ HTTPS trên điện thoại.
2. **Android (Chrome):** menu ⋮ → *Cài đặt ứng dụng*. **iPhone (Safari, iOS 16.4+):** nút Chia sẻ → *Thêm vào MH chính*, rồi mở app từ biểu tượng.
3. Đăng ký/đăng nhập → ⚙️ **Cài đặt** → chọn giờ → **Bật nhắc học trên thiết bị này** → **Gửi thử**.

## Kiểm tra an toàn trước khi mời người khác

- [ ] Đặt `JWT_SECRET` riêng, không chia sẻ.
- [ ] Chỉ truy cập qua HTTPS.
- [ ] Đã có sao lưu thư mục dữ liệu (DB + `vapid.json`). Mất `vapid.json` thì mọi thiết bị phải bật lại thông báo.
- [ ] Không mang tài khoản thử `test@langapp.test` lên bản thật.
- [ ] Ai có địa chỉ cũng tự đăng ký được và tên hiện trên bảng xếp hạng (trừ khi họ chọn ẩn danh).
