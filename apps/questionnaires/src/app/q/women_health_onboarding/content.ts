// Content shown on the result page for each flower type. Edit text
// here when ops wants to tweak the descriptions / nutrient list /
// lifestyle tips — the spec on HQ only stores the short type key.
//
// Keep in sync with the classification_rules' output_label values in
// docs/specs/women_health_onboarding.json.
// Second-person pronoun: always 你 (no 妳), per ops convention.

export type FlowerKey = 'daisy' | 'rose' | 'orchid' | 'sunflower' | 'ineligible';

export interface FlowerContent {
  emoji: string;
  shortName: string;
  subtitle: string;
  hashtags: string[];
  description: string;
  manifestations: string[];
  mechanism: string;
  keyMessage: string;
  nutrients: { name: string; reason: string }[];
  diet: string[];
  lifestyle: string[];
  /** Tailwind utility class fragments for the type's accent. */
  accent: {
    text: string;
    bg: string;
    bgTint: string;
    border: string;
    gradientFrom: string;
    gradientTo: string;
  };
}

const ACCENT = {
  daisy: {
    text: 'text-wh-daisy',
    bg: 'bg-wh-daisy',
    bgTint: 'bg-wh-daisy-tint',
    border: 'border-wh-daisy',
    gradientFrom: 'from-wh-daisy',
    gradientTo: 'to-wh-accent',
  },
  rose: {
    text: 'text-wh-primary',
    bg: 'bg-wh-primary',
    bgTint: 'bg-wh-rose-tint',
    border: 'border-wh-primary',
    gradientFrom: 'from-wh-primary',
    gradientTo: 'to-wh-secondary',
  },
  orchid: {
    text: 'text-wh-mauve',
    bg: 'bg-wh-mauve',
    bgTint: 'bg-wh-mauve-tint',
    border: 'border-wh-mauve',
    gradientFrom: 'from-wh-mauve',
    gradientTo: 'to-wh-secondary',
  },
  sunflower: {
    text: 'text-wh-accent',
    bg: 'bg-wh-accent',
    bgTint: 'bg-wh-rose-tint',
    border: 'border-wh-accent',
    gradientFrom: 'from-wh-accent',
    gradientTo: 'to-wh-daisy',
  },
};

export const FLOWERS: Record<Exclude<FlowerKey, 'ineligible'>, FlowerContent> = {
  daisy: {
    emoji: '🌼',
    shortName: '雛菊型',
    subtitle: '穩定保養型',
    hashtags: ['#穩定保養型', '#狀態佳但想更好', '#日常習慣派'],
    description:
      '你像雛菊一樣穩定、日常、自然且平衡。大多數時候沒有特別明顯的不適，但這不代表不需要照顧自己。對你來說，真正影響狀態的，往往不是單一症狀，而是睡眠、壓力、飲食、活動量與私密處照護等日常累積。',
    manifestations: [
      '沒有明顯固定困擾',
      '偶爾私密處悶熱或輕微不適',
      '偶發分泌物變化',
      '經前輕微疲倦或情緒波動',
      '想建立長期保養習慣',
    ],
    mechanism:
      '雛菊型的人非常幸運，目前沒有明顯單一失衡訊號，代表身體大多還能維持基本平衡。這一型的重點通常不是「修正問題」，而是維持腸道菌相、免疫、睡眠、壓力與私密處環境的穩定，避免日常累積的小失衡慢慢放大。',
    keyMessage:
      '沒有太大的困擾就是最適合穩定保養的時候！趁現在建立好習慣，讓好氣色定格在你的臉上。',
    nutrients: [
      { name: '益生菌', reason: '支持腸道與私密菌相平衡' },
      { name: 'Omega-3', reason: '支持抗發炎與整體女性健康' },
      { name: '維生素 D', reason: '支持免疫與荷爾蒙健康' },
      { name: '鎂', reason: '支持壓力調節與睡眠品質' },
      { name: '膳食纖維', reason: '支持腸道健康與代謝平衡' },
    ],
    diet: [
      '增加原型食物比例',
      '每餐攝取蛋白質',
      '增加蔬菜與高纖食物',
      '減少高糖與高加工食品',
      '足夠水分',
    ],
    lifestyle: [
      '規律作息',
      '每週規律活動',
      '私密處保持乾爽透氣',
      '避免刺激性清潔產品',
      '壓力管理',
    ],
    accent: ACCENT.daisy,
  },
  rose: {
    emoji: '🌹',
    shortName: '玫瑰型',
    subtitle: '週期波動型',
    hashtags: ['#週期波動型', '#經前像換一個人', '#需要提早準備'],
    description:
      '你像玫瑰一樣有盛開與含苞的節奏，也帶著敏感與起伏。你的身體對週期變化比較敏銳，尤其在經前或黃體期，情緒、食慾、水腫、疲倦等感受可能會更明顯。對你來說，照顧重點不是一成不變，而是跟著週期提前調整。',
    manifestations: [
      '經前身體和情緒變化明顯，像突然切換成另一種模式',
      '情緒比較容易起伏，會突然煩躁、低落或想哭',
      '經前容易水腫，覺得身體變重、臉或肚子比較腫',
      '特別想吃甜食、澱粉，或突然很想吃某種東西',
      '容易乳房脹、頭痛、疲倦，活動力明顯下降',
    ],
    mechanism:
      '玫瑰型的重點是「身體對週期變化比較敏銳」。排卵後到月經來之前，荷爾蒙會自然起伏，有些人的身體會對這段變化特別敏感，進而影響情緒、睡眠、食慾與水分調節。所以經前幾天可能特別容易煩躁、低落、想吃甜食、覺得腫脹或明顯疲倦。代表你的身體在週期轉換時，需要更多穩定支持。',
    keyMessage:
      '不要想著忍耐一下就好了！你的經前不適可以透過提早做好營養、睡眠與壓力調整而獲得舒緩的。',
    nutrients: [
      { name: '鎂', reason: '支持肌肉放鬆與情緒穩定' },
      { name: '維生素 B6', reason: '支持 PMS 與神經傳導平衡' },
      { name: 'Omega-3', reason: '支持抗發炎與經前不適管理' },
      { name: '鈣', reason: '支持 PMS 症狀調節' },
      { name: '維生素 D', reason: '支持情緒與荷爾蒙平衡' },
    ],
    diet: [
      '黃體期減少高糖與高鹽',
      '增加蛋白質',
      '規律進食',
      '減少咖啡因',
      '增加抗氧化食物',
    ],
    lifestyle: [
      '依週期調整活動節奏',
      '黃體期提前睡眠',
      'PMS 時減少高壓安排',
      '維持規律活動',
    ],
    accent: ACCENT.rose,
  },
  orchid: {
    emoji: '🌺',
    shortName: '蘭花型',
    subtitle: '週期不規律型',
    hashtags: ['#週期不規律型', '#壓力反應在週期裡', '#找回生活節奏'],
    description:
      '你像蘭花一樣對環境變化比較敏感，需要穩定以及規律來支撐。當作息混亂、壓力來襲、睡眠不足，或生活型態長期不固定時，月經節律就可能受到影響。你的核心不是單一症狀，而是整體生理節律需要重新被檢視並安定下來。',
    manifestations: [
      '月經週期常常不到 3 週就來，或超過 5 週才來',
      '壓力大、熬夜或作息不固定時，月經也容易跟著亂掉',
      '有時整個月沒來，或經血量、天數落差很大',
      '月經前的身體訊號不固定，有時症狀嚴重有時沒有症狀',
      '週期亂的同時，也容易冒痘、經前不舒服或乳房脹脹的',
    ],
    mechanism:
      '蘭花型的人週期調節比較容易被打亂——月經不是單純子宮自己決定，而是身體會先透過壓力、睡眠、營養與能量狀態，判斷現在適不適合維持穩定排卵。當壓力大、睡不好、作息亂、吃太少或生活變動大時，身體可能會先降低排卵穩定度，月經就容易提早、延後、整個月沒來，或經血量和天數變得不固定。',
    keyMessage:
      '需要先把睡眠、壓力和三餐節奏穩定好，月經節奏和身體狀態也比較有機會跟著穩定。',
    nutrients: [
      { name: '鎂', reason: '支持壓力調節與神經系統穩定' },
      { name: 'Omega-3', reason: '支持抗發炎與荷爾蒙健康' },
      { name: '維生素 D', reason: '支持荷爾蒙與免疫調節' },
      { name: 'B 群', reason: '支持能量代謝與壓力調節' },
      { name: '肌醇', reason: '支持排卵與代謝平衡' },
    ],
    diet: [
      '規律進食',
      '避免極端節食',
      '足夠蛋白質',
      '穩定血糖',
      '減少高糖加工飲食',
    ],
    lifestyle: [
      '固定睡眠時間',
      '規律活動',
      '壓力管理',
      '避免過度訓練',
      '建立穩定節律',
    ],
    accent: ACCENT.orchid,
  },
  sunflower: {
    emoji: '🌻',
    shortName: '向日葵型',
    subtitle: '代謝能量型',
    hashtags: ['#代謝能量型', '#不是嘴饞而已', '#需要多留意血糖'],
    description:
      '你像向日葵一樣會隨著能量消長與代謝節律而轉動。當血糖波動大、容易餓、飯後想睡、體重增加或腹部脂肪上升時，可能代表身體在代謝調節上需要更多支持。這類型也可能與女性荷爾蒙平衡及 PCOS/PMOS（多囊性卵巢症候群 / 多內分泌代謝卵巢症候群）傾向有關。',
    manifestations: [
      '吃完飯後特別想睡，下午也容易精神不濟',
      '容易突然很餓，特別想吃甜食、澱粉或手搖飲',
      '容易覺得累、想睡或注意力變差等能量較低的情況',
      '體重或小腹變得比較難控制',
      '月經也可能不太穩定，或經前更容易嘴饞、疲倦',
    ],
    mechanism:
      '向日葵型的重點是「血糖和能量調節比較不穩」。吃完飯後，身體需要把血糖送進細胞變成能量；如果這個調節過程不夠穩，血糖可能先快速上升、再快速下降，或讓身體需要分泌更多胰島素來處理。這時就容易出現飯後想睡、很快又餓、想吃甜食、注意力下降，因此也可能讓體重、小腹和週期穩定度受到影響。',
    keyMessage:
      '需要先留意血糖的穩定，當身體不用一直忙著處理血糖波動，代謝與週期也比較容易回到穩定節奏。',
    nutrients: [
      { name: '鎂', reason: '支持胰島素敏感性與血糖調節' },
      { name: 'Omega-3', reason: '支持抗發炎與代謝健康' },
      { name: '肌醇', reason: '支持胰島素敏感性與 PCOS 相關調節' },
      { name: '維生素 D', reason: '支持代謝與胰島素功能' },
      { name: '膳食纖維', reason: '幫助穩定血糖與增加飽足感' },
    ],
    diet: [
      '穩定血糖餐盤',
      '每餐蛋白質優先',
      '主食避免單吃',
      '減少含糖飲料',
      '高纖飲食',
    ],
    lifestyle: [
      '固定三餐時間，避免長時間空腹',
      '飯後 10 分鐘輕度活動',
      '優先處理腹部脂肪的運動',
      '充足睡眠以穩定血糖',
      '壓力管理',
    ],
    accent: ACCENT.sunflower,
  },
};
