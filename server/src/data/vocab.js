// Dữ liệu từ vựng mẫu. Mỗi thẻ: [term, phonetic, meaning_vi, example, example_vi]
// Có thể thêm bộ mới: thêm phần tử vào mảng rồi chạy `npm run seed` (chỉ thêm, không xoá tiến độ).

import { enMore } from './en-more.js';
import { zhMore } from './zh-more.js';
import { enB1B2 } from './en-b1b2.js';
import { zhHsk345 } from './zh-hsk345.js';

const baseDecks = [
  // ======================= TIẾNG ANH =======================
  {
    lang: 'en', slug: 'en-greetings', title: 'Chào hỏi & giao tiếp', level: 'A1', sort_order: 1,
    description: 'Những câu, từ dùng hằng ngày khi gặp gỡ',
    cards: [
      ['hello', '/həˈloʊ/', 'xin chào', 'Hello, my name is Lan.', 'Xin chào, tên tôi là Lan.'],
      ['goodbye', '/ˌɡʊdˈbaɪ/', 'tạm biệt', 'Goodbye, see you tomorrow!', 'Tạm biệt, hẹn gặp lại ngày mai!'],
      ['thank you', '/ˈθæŋk juː/', 'cảm ơn', 'Thank you for your help.', 'Cảm ơn sự giúp đỡ của bạn.'],
      ['sorry', '/ˈsɑːri/', 'xin lỗi', 'Sorry, I am late.', 'Xin lỗi, tôi đến muộn.'],
      ['please', '/pliːz/', 'làm ơn, vui lòng', 'Please sit down.', 'Mời bạn ngồi.'],
      ['friend', '/frend/', 'bạn bè', 'She is my best friend.', 'Cô ấy là bạn thân nhất của tôi.'],
      ['name', '/neɪm/', 'tên', 'What is your name?', 'Tên bạn là gì?'],
      ['meet', '/miːt/', 'gặp', 'Nice to meet you.', 'Rất vui được gặp bạn.'],
      ['welcome', '/ˈwelkəm/', 'chào mừng', 'Welcome to Vietnam!', 'Chào mừng đến Việt Nam!'],
      ['morning', '/ˈmɔːrnɪŋ/', 'buổi sáng', 'Good morning, everyone.', 'Chào buổi sáng mọi người.'],
      ['question', '/ˈkwestʃən/', 'câu hỏi', 'Can I ask a question?', 'Tôi có thể hỏi một câu không?'],
      ['answer', '/ˈænsər/', 'câu trả lời; trả lời', 'Please answer the phone.', 'Làm ơn nghe máy điện thoại.'],
    ],
  },
  {
    lang: 'en', slug: 'en-family', title: 'Gia đình & con người', level: 'A1', sort_order: 2,
    description: 'Thành viên gia đình và mô tả người',
    cards: [
      ['family', '/ˈfæməli/', 'gia đình', 'I love my family.', 'Tôi yêu gia đình mình.'],
      ['mother', '/ˈmʌðər/', 'mẹ', 'My mother is a teacher.', 'Mẹ tôi là giáo viên.'],
      ['father', '/ˈfɑːðər/', 'bố', 'His father works in Hanoi.', 'Bố anh ấy làm việc ở Hà Nội.'],
      ['brother', '/ˈbrʌðər/', 'anh/em trai', 'I have one younger brother.', 'Tôi có một em trai.'],
      ['sister', '/ˈsɪstər/', 'chị/em gái', 'My sister likes music.', 'Chị gái tôi thích âm nhạc.'],
      ['child', '/tʃaɪld/', 'đứa trẻ', 'The child is sleeping.', 'Đứa trẻ đang ngủ.'],
      ['husband', '/ˈhʌzbənd/', 'chồng', 'Her husband cooks dinner.', 'Chồng cô ấy nấu bữa tối.'],
      ['wife', '/waɪf/', 'vợ', 'This is my wife, Mai.', 'Đây là vợ tôi, Mai.'],
      ['young', '/jʌŋ/', 'trẻ', 'He is young and strong.', 'Anh ấy trẻ và khoẻ.'],
      ['old', '/oʊld/', 'già; cũ', 'My grandfather is very old.', 'Ông tôi đã rất già.'],
      ['tall', '/tɔːl/', 'cao', 'My brother is tall.', 'Anh trai tôi cao.'],
      ['kind', '/kaɪnd/', 'tốt bụng', 'She is kind to everyone.', 'Cô ấy tốt bụng với mọi người.'],
    ],
  },
  {
    lang: 'en', slug: 'en-food', title: 'Đồ ăn & đồ uống', level: 'A1', sort_order: 3,
    description: 'Gọi món, ăn uống, mua sắm thực phẩm',
    cards: [
      ['water', '/ˈwɔːtər/', 'nước', 'Can I have some water?', 'Cho tôi xin ít nước được không?'],
      ['rice', '/raɪs/', 'cơm, gạo', 'We eat rice every day.', 'Chúng tôi ăn cơm mỗi ngày.'],
      ['bread', '/bred/', 'bánh mì', 'I buy bread in the morning.', 'Tôi mua bánh mì vào buổi sáng.'],
      ['coffee', '/ˈkɔːfi/', 'cà phê', 'Vietnamese coffee is strong.', 'Cà phê Việt Nam rất đậm.'],
      ['tea', '/tiː/', 'trà', 'Would you like some tea?', 'Bạn có muốn uống trà không?'],
      ['chicken', '/ˈtʃɪkɪn/', 'thịt gà; con gà', 'I would like chicken soup.', 'Tôi muốn món súp gà.'],
      ['fish', '/fɪʃ/', 'cá', 'This fish is very fresh.', 'Con cá này rất tươi.'],
      ['vegetable', '/ˈvedʒtəbəl/', 'rau củ', 'Eat more vegetables.', 'Hãy ăn nhiều rau hơn.'],
      ['fruit', '/fruːt/', 'trái cây', 'Mango is my favorite fruit.', 'Xoài là loại trái cây tôi thích nhất.'],
      ['delicious', '/dɪˈlɪʃəs/', 'ngon', 'This pho is delicious!', 'Phở này ngon quá!'],
      ['hungry', '/ˈhʌŋɡri/', 'đói', 'I am hungry now.', 'Bây giờ tôi đói.'],
      ['menu', '/ˈmenjuː/', 'thực đơn', 'Can I see the menu?', 'Cho tôi xem thực đơn được không?'],
    ],
  },
  {
    lang: 'en', slug: 'en-work', title: 'Công việc & văn phòng', level: 'A2', sort_order: 4,
    description: 'Từ vựng nơi làm việc',
    cards: [
      ['meeting', '/ˈmiːtɪŋ/', 'cuộc họp', 'The meeting starts at 9 a.m.', 'Cuộc họp bắt đầu lúc 9 giờ sáng.'],
      ['deadline', '/ˈdedlaɪn/', 'hạn chót', 'The deadline is next Friday.', 'Hạn chót là thứ Sáu tới.'],
      ['colleague', '/ˈkɑːliːɡ/', 'đồng nghiệp', 'My colleagues are friendly.', 'Đồng nghiệp của tôi rất thân thiện.'],
      ['manager', '/ˈmænɪdʒər/', 'quản lý', 'Please talk to the manager.', 'Hãy nói chuyện với quản lý.'],
      ['report', '/rɪˈpɔːrt/', 'báo cáo', 'I need to finish this report.', 'Tôi cần hoàn thành báo cáo này.'],
      ['salary', '/ˈsæləri/', 'lương', 'The salary is paid monthly.', 'Lương được trả hằng tháng.'],
      ['schedule', '/ˈskedʒuːl/', 'lịch trình', 'Let me check my schedule.', 'Để tôi xem lịch của mình.'],
      ['customer', '/ˈkʌstəmər/', 'khách hàng', 'The customer is always right.', 'Khách hàng luôn đúng.'],
      ['email', '/ˈiːmeɪl/', 'thư điện tử', 'I will send you an email.', 'Tôi sẽ gửi email cho bạn.'],
      ['experience', '/ɪkˈspɪriəns/', 'kinh nghiệm', 'She has five years of experience.', 'Cô ấy có năm năm kinh nghiệm.'],
      ['interview', '/ˈɪntərvjuː/', 'phỏng vấn', 'I have a job interview today.', 'Hôm nay tôi có buổi phỏng vấn xin việc.'],
      ['project', '/ˈprɑːdʒekt/', 'dự án', 'This project is very important.', 'Dự án này rất quan trọng.'],
    ],
  },

  // ======================= TIẾNG TRUNG =======================
  {
    lang: 'zh', slug: 'zh-greetings', title: 'Chào hỏi (HSK 1)', level: 'HSK1', sort_order: 1,
    description: 'Câu chào và giao tiếp cơ bản',
    cards: [
      ['你好', 'nǐ hǎo', 'xin chào', '你好，我叫小明。', 'Xin chào, tôi tên là Tiểu Minh.'],
      ['谢谢', 'xièxie', 'cảm ơn', '谢谢你的帮助。', 'Cảm ơn sự giúp đỡ của bạn.'],
      ['不客气', 'bú kèqi', 'không có gì', 'A：谢谢！B：不客气。', 'A: Cảm ơn! B: Không có gì.'],
      ['对不起', 'duìbuqǐ', 'xin lỗi', '对不起，我来晚了。', 'Xin lỗi, tôi đến muộn.'],
      ['没关系', 'méi guānxi', 'không sao', '没关系，请坐。', 'Không sao, mời ngồi.'],
      ['再见', 'zàijiàn', 'tạm biệt', '老师，再见！', 'Tạm biệt thầy ạ!'],
      ['我', 'wǒ', 'tôi', '我是越南人。', 'Tôi là người Việt Nam.'],
      ['你', 'nǐ', 'bạn, anh, chị', '你是学生吗？', 'Bạn là học sinh à?'],
      ['他', 'tā', 'anh ấy', '他是我的朋友。', 'Anh ấy là bạn của tôi.'],
      ['她', 'tā', 'cô ấy', '她很漂亮。', 'Cô ấy rất xinh.'],
      ['朋友', 'péngyou', 'bạn bè', '我有很多朋友。', 'Tôi có rất nhiều bạn.'],
      ['名字', 'míngzi', 'tên', '你叫什么名字？', 'Bạn tên là gì?'],
    ],
  },
  {
    lang: 'zh', slug: 'zh-numbers', title: 'Số đếm & thời gian (HSK 1)', level: 'HSK1', sort_order: 2,
    description: 'Số từ 1–10, ngày, giờ',
    cards: [
      ['一', 'yī', 'một', '我有一个哥哥。', 'Tôi có một anh trai.'],
      ['二', 'èr', 'hai', '今天是二号。', 'Hôm nay là ngày mùng hai.'],
      ['三', 'sān', 'ba', '我有三本书。', 'Tôi có ba quyển sách.'],
      ['四', 'sì', 'bốn', '四个人。', 'Bốn người.'],
      ['五', 'wǔ', 'năm (số 5)', '五点见。', 'Gặp lúc 5 giờ.'],
      ['六', 'liù', 'sáu', '六月很热。', 'Tháng sáu rất nóng.'],
      ['七', 'qī', 'bảy', '一个星期有七天。', 'Một tuần có bảy ngày.'],
      ['八', 'bā', 'tám', '八块钱。', 'Tám đồng.'],
      ['九', 'jiǔ', 'chín', '九点上课。', '9 giờ vào học.'],
      ['十', 'shí', 'mười', '我十岁。', 'Tôi mười tuổi.'],
      ['今天', 'jīntiān', 'hôm nay', '今天星期一。', 'Hôm nay là thứ Hai.'],
      ['明天', 'míngtiān', 'ngày mai', '明天见！', 'Mai gặp nhé!'],
    ],
  },
  {
    lang: 'zh', slug: 'zh-family', title: 'Gia đình (HSK 1–2)', level: 'HSK1', sort_order: 3,
    description: 'Thành viên gia đình',
    cards: [
      ['家', 'jiā', 'nhà, gia đình', '我家有四口人。', 'Nhà tôi có bốn người.'],
      ['爸爸', 'bàba', 'bố', '我爸爸是医生。', 'Bố tôi là bác sĩ.'],
      ['妈妈', 'māma', 'mẹ', '妈妈在做饭。', 'Mẹ đang nấu cơm.'],
      ['哥哥', 'gēge', 'anh trai', '我哥哥很高。', 'Anh trai tôi rất cao.'],
      ['姐姐', 'jiějie', 'chị gái', '姐姐喜欢唱歌。', 'Chị gái thích hát.'],
      ['弟弟', 'dìdi', 'em trai', '弟弟八岁了。', 'Em trai tám tuổi rồi.'],
      ['妹妹', 'mèimei', 'em gái', '我妹妹是学生。', 'Em gái tôi là học sinh.'],
      ['儿子', 'érzi', 'con trai', '他的儿子很聪明。', 'Con trai anh ấy rất thông minh.'],
      ['女儿', 'nǚ\'ér', 'con gái', '她有一个女儿。', 'Cô ấy có một cô con gái.'],
      ['人', 'rén', 'người', '中国人。', 'Người Trung Quốc.'],
      ['爱', 'ài', 'yêu', '我爱我的家。', 'Tôi yêu gia đình tôi.'],
      ['大', 'dà', 'to, lớn', '这个房子很大。', 'Căn nhà này rất to.'],
    ],
  },
  {
    lang: 'zh', slug: 'zh-food', title: 'Ăn uống (HSK 1–2)', level: 'HSK1', sort_order: 4,
    description: 'Gọi món, đồ ăn thức uống',
    cards: [
      ['吃', 'chī', 'ăn', '你吃饭了吗？', 'Bạn ăn cơm chưa?'],
      ['喝', 'hē', 'uống', '我想喝水。', 'Tôi muốn uống nước.'],
      ['水', 'shuǐ', 'nước', '请给我一杯水。', 'Làm ơn cho tôi một cốc nước.'],
      ['米饭', 'mǐfàn', 'cơm', '我要一碗米饭。', 'Tôi muốn một bát cơm.'],
      ['茶', 'chá', 'trà', '中国茶很有名。', 'Trà Trung Quốc rất nổi tiếng.'],
      ['菜', 'cài', 'món ăn; rau', '这个菜很好吃。', 'Món này rất ngon.'],
      ['苹果', 'píngguǒ', 'quả táo', '我喜欢吃苹果。', 'Tôi thích ăn táo.'],
      ['好吃', 'hǎochī', 'ngon', '饺子很好吃！', 'Sủi cảo rất ngon!'],
      ['饭店', 'fàndiàn', 'nhà hàng', '我们去饭店吃饭吧。', 'Chúng ta đi nhà hàng ăn đi.'],
      ['多少钱', 'duōshao qián', 'bao nhiêu tiền', '这个多少钱？', 'Cái này bao nhiêu tiền?'],
      ['杯子', 'bēizi', 'cái cốc', '桌子上有一个杯子。', 'Trên bàn có một cái cốc.'],
      ['想', 'xiǎng', 'muốn; nghĩ', '我想吃面条。', 'Tôi muốn ăn mì.'],
    ],
  },
];

export const decks = [...baseDecks, ...enMore, ...enB1B2, ...zhMore, ...zhHsk345];

// Kho từ lớn sinh từ danh sách mở (HSK, CEFR-J) — xem DATA_LICENSES.md
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
for (const lang of ['en', 'zh']) {
  const f = path.join(here, `generated-${lang}.json`);
  if (fs.existsSync(f)) decks.push(...JSON.parse(fs.readFileSync(f, 'utf8')));
}
