// Dữ liệu bảng chữ cái cho 3 ngôn ngữ

// ---------- Tiếng Anh ----------
// [chữ, tên đọc (gần đúng cho người Việt), IPA tên chữ, từ ví dụ, nghĩa, nguyên âm?]
// Chữ viết ra để máy đọc đúng TÊN chữ (đọc "A" trơn có máy đọc thành "capital A")
const SAY = "ay bee see dee ee eff gee aitch eye jay kay el em en oh pee cue are ess tee you vee double-you ex why zee".split(" ");
export const EN_LETTERS = [
  ['A', 'ây', '/eɪ/', 'apple', 'quả táo', true], ['B', 'bi', '/biː/', 'book', 'quyển sách'],
  ['C', 'xi', '/siː/', 'cat', 'con mèo'], ['D', 'đi', '/diː/', 'dog', 'con chó'],
  ['E', 'i', '/iː/', 'egg', 'quả trứng', true], ['F', 'ép', '/ɛf/', 'fish', 'con cá'],
  ['G', 'dzi', '/dʒiː/', 'girl', 'cô gái'], ['H', 'ếch', '/eɪtʃ/', 'hat', 'cái mũ'],
  ['I', 'ai', '/aɪ/', 'ice', 'nước đá', true], ['J', 'dzây', '/dʒeɪ/', 'juice', 'nước ép'],
  ['K', 'kây', '/keɪ/', 'key', 'chìa khoá'], ['L', 'eo', '/ɛl/', 'lion', 'sư tử'],
  ['M', 'em', '/ɛm/', 'moon', 'mặt trăng'], ['N', 'en', '/ɛn/', 'nose', 'cái mũi'],
  ['O', 'âu', '/oʊ/', 'orange', 'quả cam', true], ['P', 'pi', '/piː/', 'pen', 'cây bút'],
  ['Q', 'kiu', '/kjuː/', 'queen', 'nữ hoàng'], ['R', 'a (ar)', '/ɑːr/', 'rain', 'cơn mưa'],
  ['S', 'ét', '/ɛs/', 'sun', 'mặt trời'], ['T', 'ti', '/tiː/', 'tree', 'cái cây'],
  ['U', 'diu', '/juː/', 'umbrella', 'cái ô', true], ['V', 'vi', '/viː/', 'violin', 'đàn vi-ô-lông'],
  ['W', 'đấp-bồ-liu', '/ˈdʌbəl juː/', 'water', 'nước'], ['X', 'ếch-xì', '/ɛks/', 'box', 'cái hộp'],
  ['Y', 'oai', '/waɪ/', 'yellow', 'màu vàng'], ['Z', 'di (zi)', '/ziː/', 'zebra', 'ngựa vằn'],
].map(([letter, name, ipa, word, meaning, vowel], i) => ({ say: SAY[i], letter, lower: letter.toLowerCase(), name, ipa, word, meaning, vowel: !!vowel }));

// ---------- Tiếng Nhật ----------
const parse = (s) => s.trim().split(/\s+/).map((x) => { const [k, r] = x.split('/'); return { kana: k, romaji: r }; });

// Các hàng hiragana cơ bản (katakana lấy bằng cách cộng 0x60 mã Unicode)
export const KANA_ROWS = [
  ['Nguyên âm', parse('あ/a い/i う/u え/e お/o')],
  ['Hàng K', parse('か/ka き/ki く/ku け/ke こ/ko')],
  ['Hàng S', parse('さ/sa し/shi す/su せ/se そ/so')],
  ['Hàng T', parse('た/ta ち/chi つ/tsu て/te と/to')],
  ['Hàng N', parse('な/na に/ni ぬ/nu ね/ne の/no')],
  ['Hàng H', parse('は/ha ひ/hi ふ/fu へ/he ほ/ho')],
  ['Hàng M', parse('ま/ma み/mi む/mu め/me も/mo')],
  ['Hàng Y', parse('や/ya ゆ/yu よ/yo')],
  ['Hàng R', parse('ら/ra り/ri る/ru れ/re ろ/ro')],
  ['Hàng W', parse('わ/wa を/wo ん/n')],
];
export const DAKUTEN_ROWS = [
  ['Hàng G (ngầm)', parse('が/ga ぎ/gi ぐ/gu げ/ge ご/go')],
  ['Hàng Z', parse('ざ/za じ/ji ず/zu ぜ/ze ぞ/zo')],
  ['Hàng D', parse('だ/da ぢ/ji づ/zu で/de ど/do')],
  ['Hàng B', parse('ば/ba び/bi ぶ/bu べ/be ぼ/bo')],
  ['Hàng P (bán đục)', parse('ぱ/pa ぴ/pi ぷ/pu ぺ/pe ぽ/po')],
];
export const YOON_ROWS = [
  ['Kya', parse('きゃ/kya きゅ/kyu きょ/kyo')], ['Sha', parse('しゃ/sha しゅ/shu しょ/sho')],
  ['Cha', parse('ちゃ/cha ちゅ/chu ちょ/cho')], ['Nya', parse('にゃ/nya にゅ/nyu にょ/nyo')],
  ['Hya', parse('ひゃ/hya ひゅ/hyu ひょ/hyo')], ['Mya', parse('みゃ/mya みゅ/myu みょ/myo')],
  ['Rya', parse('りゃ/rya りゅ/ryu りょ/ryo')], ['Gya', parse('ぎゃ/gya ぎゅ/gyu ぎょ/gyo')],
  ['Ja', parse('じゃ/ja じゅ/ju じょ/jo')], ['Bya', parse('びゃ/bya びゅ/byu びょ/byo')],
  ['Pya', parse('ぴゃ/pya ぴゅ/pyu ぴょ/pyo')],
];
export const KANA_SPECIAL = [
  { kana: 'っ', romaji: '(tsu nhỏ)', note: 'Âm ngắt: gấp đôi phụ âm đứng sau. VD: きって (kitte) = con tem.' },
  { kana: 'ゃ', romaji: '(ya nhỏ)', note: 'Ghép sau các chữ cột い để tạo âm ghép. VD: きゃ = kya.' },
  { kana: 'ゅ', romaji: '(yu nhỏ)', note: 'VD: しゅ = shu.' },
  { kana: 'ょ', romaji: '(yo nhỏ)', note: 'VD: ちょ = cho.' },
  { kana: 'ん', romaji: 'n', note: 'Âm mũi đứng cuối âm tiết, không đứng đầu từ.' },
];
export const toKatakana = (s) => s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));

export const KANA_RULES = [
  'Hiragana dùng cho từ thuần Nhật, trợ từ và đuôi động từ/tính từ; katakana dùng cho từ mượn nước ngoài, tên riêng, từ tượng thanh.',
  'Dấu ゛(dakuten) biến âm vô thanh thành hữu thanh: か → が; dấu ゜(handakuten) chỉ dùng với hàng H: は → ぱ.',
  'Katakana kéo dài nguyên âm bằng dấu ー: コーヒー (kōhī) = cà phê.',
  'Thứ tự nét: từ trái sang phải, từ trên xuống dưới. Hãy xem hoạt ảnh rồi tập viết theo.',
];

// ---------- Tiếng Trung ----------
// [chữ cái, chữ Hán ví dụ, pinyin ví dụ, nghĩa]
const zi = (s) => s.trim().split('\n').map((l) => { const [p, c, py, m] = l.trim().split('|'); return { sym: p, char: c, pinyin: py, meaning: m }; });
export const PINYIN_INITIALS = zi(`
b|爸|bà|bố
p|怕|pà|sợ
m|妈|mā|mẹ
f|发|fā|phát
d|大|dà|to
t|他|tā|anh ấy
n|你|nǐ|bạn
l|来|lái|đến
g|个|gè|cái
k|看|kàn|xem
h|好|hǎo|tốt
j|家|jiā|nhà
q|去|qù|đi
x|学|xué|học
zh|这|zhè|này
ch|吃|chī|ăn
sh|是|shì|là
r|人|rén|người
z|在|zài|ở
c|菜|cài|món ăn
s|四|sì|bốn
y|有|yǒu|có
w|我|wǒ|tôi`);
export const PINYIN_FINALS = zi(`
a|阿|ā|a (thán từ)
o|哦|ó|ồ
e|鹅|é|con ngỗng
i|一|yī|một
u|五|wǔ|năm
ü|鱼|yú|con cá
ai|爱|ài|yêu
ei|黑|hēi|đen
ui|水|shuǐ|nước
ao|好|hǎo|tốt
ou|手|shǒu|tay
iu|六|liù|sáu
ie|写|xiě|viết
üe|月|yuè|tháng
er|二|èr|hai
an|看|kàn|xem
en|人|rén|người
in|您|nín|ngài
un|春|chūn|mùa xuân
ün|云|yún|mây
ang|上|shàng|trên
eng|冷|lěng|lạnh
ing|星|xīng|ngôi sao
ong|中|zhōng|giữa`);
export const TONES = [
  { n: '1', name: 'Thanh 1 — ngang cao', mark: 'ā', char: '妈', pinyin: 'mā', meaning: 'mẹ', tip: 'Giữ giọng cao và đều (như thanh ngang cao).' },
  { n: '2', name: 'Thanh 2 — lên', mark: 'á', char: '麻', pinyin: 'má', meaning: 'cây gai', tip: 'Đi lên từ giữa lên cao, như thanh sắc.' },
  { n: '3', name: 'Thanh 3 — xuống rồi lên', mark: 'ǎ', char: '马', pinyin: 'mǎ', meaning: 'ngựa', tip: 'Hạ thấp rồi nhích lên, như thanh hỏi kéo dài.' },
  { n: '4', name: 'Thanh 4 — xuống', mark: 'à', char: '骂', pinyin: 'mà', meaning: 'mắng', tip: 'Rơi nhanh từ cao xuống thấp, như thanh nặng dứt khoát.' },
  { n: '0', name: 'Thanh nhẹ', mark: 'a', char: '吗', pinyin: 'ma', meaning: 'trợ từ nghi vấn', tip: 'Đọc ngắn và nhẹ, không có dấu.' },
];
export const BASIC_STROKES = [
  { name: '横', py: 'héng', vi: 'ngang', char: '一' },
  { name: '竖', py: 'shù', vi: 'sổ thẳng', char: '十' },
  { name: '撇', py: 'piě', vi: 'phẩy', char: '人' },
  { name: '捺', py: 'nà', vi: 'mác', char: '八' },
  { name: '点', py: 'diǎn', vi: 'chấm', char: '六' },
  { name: '提', py: 'tí', vi: 'hất', char: '我' },
  { name: '横折', py: 'héngzhé', vi: 'ngang gập', char: '口' },
  { name: '竖钩', py: 'shùgōu', vi: 'sổ móc', char: '小' },
  { name: '横钩', py: 'hénggōu', vi: 'ngang móc', char: '写' },
  { name: '竖弯钩', py: 'shùwāngōu', vi: 'sổ cong móc', char: '先' },
  { name: '横折钩', py: 'héngzhégōu', vi: 'ngang gập móc', char: '月' },
  { name: '斜钩', py: 'xiégōu', vi: 'xiên móc', char: '我' },
];
export const STROKE_RULES = [
  ['先横后竖', 'Ngang trước, sổ sau', '十'], ['先撇后捺', 'Phẩy trước, mác sau', '人'],
  ['从上到下', 'Từ trên xuống dưới', '三'], ['从左到右', 'Từ trái sang phải', '休'],
  ['先中间后两边', 'Giữa trước, hai bên sau', '小'], ['先外后内', 'Ngoài trước, trong sau', '月'],
  ['先进后关门', 'Vào trong rồi mới đóng khung', '国'],
].map(([zh, vi, char]) => ({ zh, vi, char }));
