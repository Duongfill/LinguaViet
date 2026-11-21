// Từ vựng cho bé dưới 5 tuổi, theo chủ đề: emoji | nghĩa Việt | Anh | Trung | pinyin | Nhật | romaji
const parse = (s) => s.trim().split('\n').map((l) => {
  const [emoji, vi, en, zh, py, ja, romaji] = l.trim().split('|');
  return { id: `${emoji}`, emoji, vi, en, zh, py, ja, romaji };
});

const nums = ['one|一|yī|いち|ichi', 'two|二|èr|に|ni', 'three|三|sān|さん|san', 'four|四|sì|よん|yon', 'five|五|wǔ|ご|go',
  'six|六|liù|ろく|roku', 'seven|七|qī|なな|nana', 'eight|八|bā|はち|hachi', 'nine|九|jiǔ|きゅう|kyū', 'ten|十|shí|じゅう|jū']
  .map((x, i) => { const [en, zh, py, ja, romaji] = x.split('|'); return { id: `n${i + 1}`, emoji: '🍎'.repeat(i + 1), digit: String(i + 1), vi: `số ${i + 1}`, en, zh, py, ja, romaji }; });

export const KIDS_TOPICS = [
  { key: 'animals', icon: '🐶', label: 'Động vật', items: parse(`
🐶|con chó|dog|狗|gǒu|いぬ|inu
🐱|con mèo|cat|猫|māo|ねこ|neko
🐰|con thỏ|rabbit|兔子|tùzi|うさぎ|usagi
🐻|con gấu|bear|熊|xióng|くま|kuma
🐘|con voi|elephant|大象|dàxiàng|ぞう|zou
🐵|con khỉ|monkey|猴子|hóuzi|さる|saru
🐯|con hổ|tiger|老虎|lǎohǔ|とら|tora
🐷|con heo|pig|猪|zhū|ぶた|buta
🐮|con bò|cow|牛|niú|うし|ushi
🐔|con gà|chicken|鸡|jī|にわとり|niwatori
🐸|con ếch|frog|青蛙|qīngwā|かえる|kaeru
🐟|con cá|fish|鱼|yú|さかな|sakana`) },
  { key: 'fruits', icon: '🍎', label: 'Trái cây', items: parse(`
🍎|quả táo|apple|苹果|píngguǒ|りんご|ringo
🍌|quả chuối|banana|香蕉|xiāngjiāo|バナナ|banana
🍊|quả cam|orange|橙子|chéngzi|みかん|mikan
🍇|quả nho|grapes|葡萄|pútao|ぶどう|budō
🍓|quả dâu|strawberry|草莓|cǎoméi|いちご|ichigo
🍉|dưa hấu|watermelon|西瓜|xīguā|すいか|suika
🍍|quả dứa|pineapple|菠萝|bōluó|パイナップル|painappuru
🍑|quả đào|peach|桃子|táozi|もも|momo
🍒|quả cherry|cherry|樱桃|yīngtáo|さくらんぼ|sakuranbo
🥭|quả xoài|mango|芒果|mángguǒ|マンゴー|mangō`) },
  { key: 'colors', icon: '🌈', label: 'Màu sắc', items: parse(`
🔴|màu đỏ|red|红色|hóngsè|あか|aka
🔵|màu xanh dương|blue|蓝色|lánsè|あお|ao
🟢|màu xanh lá|green|绿色|lǜsè|みどり|midori
🟡|màu vàng|yellow|黄色|huángsè|きいろ|kiiro
🟠|màu cam|orange|橙色|chéngsè|オレンジ|orenji
🟣|màu tím|purple|紫色|zǐsè|むらさき|murasaki
⚫|màu đen|black|黑色|hēisè|くろ|kuro
⚪|màu trắng|white|白色|báisè|しろ|shiro
🟤|màu nâu|brown|棕色|zōngsè|ちゃいろ|chairo`) },
  { key: 'numbers', icon: '🔢', label: 'Số đếm', items: nums },
  { key: 'body', icon: '👀', label: 'Cơ thể', items: parse(`
👀|đôi mắt|eyes|眼睛|yǎnjing|め|me
👂|cái tai|ear|耳朵|ěrduo|みみ|mimi
👃|cái mũi|nose|鼻子|bízi|はな|hana
👄|cái miệng|mouth|嘴巴|zuǐba|くち|kuchi
✋|bàn tay|hand|手|shǒu|て|te
🦶|bàn chân|foot|脚|jiǎo|あし|ashi
🦷|cái răng|tooth|牙齿|yáchǐ|は|ha
👅|cái lưỡi|tongue|舌头|shétou|した|shita`) },
  { key: 'vehicles', icon: '🚗', label: 'Xe cộ', items: parse(`
🚗|xe hơi|car|汽车|qìchē|くるま|kuruma
🚌|xe buýt|bus|公共汽车|gōnggòng qìchē|バス|basu
🚲|xe đạp|bicycle|自行车|zìxíngchē|じてんしゃ|jitensha
✈️|máy bay|airplane|飞机|fēijī|ひこうき|hikōki
🚂|tàu hoả|train|火车|huǒchē|でんしゃ|densha
🚢|tàu thuỷ|ship|船|chuán|ふね|fune
🚒|xe cứu hoả|fire truck|消防车|xiāofángchē|しょうぼうしゃ|shōbōsha
🚁|trực thăng|helicopter|直升机|zhíshēngjī|ヘリコプター|herikoputā`) },
  { key: 'food', icon: '🍞', label: 'Đồ ăn', items: parse(`
🍞|bánh mì|bread|面包|miànbāo|パン|pan
🥛|sữa|milk|牛奶|niúnǎi|ぎゅうにゅう|gyūnyū
🍚|cơm|rice|米饭|mǐfàn|ごはん|gohan
🥚|quả trứng|egg|鸡蛋|jīdàn|たまご|tamago
🍪|bánh quy|cookie|饼干|bǐnggān|クッキー|kukkī
🍦|kem|ice cream|冰淇淋|bīngqílín|アイスクリーム|aisukurīmu
💧|nước|water|水|shuǐ|みず|mizu
🍕|bánh pizza|pizza|比萨饼|bǐsàbǐng|ピザ|piza`) },
];

export const wordOf = (it, lang) => it[lang];
export const phoneticOf = (it, lang) => (lang === 'zh' ? it.py : lang === 'ja' ? it.romaji : '');
export const topicByKey = (k) => KIDS_TOPICS.find((t) => t.key === k) || KIDS_TOPICS[0];
