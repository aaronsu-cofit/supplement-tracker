# Questionnaire Examples

30 ready-made templates that together cover every scoring feature the
backend supports. Canonical source: `apps/hq/src/app/products/[id]/questionnaireTemplates.ts`
— loaded into the HQ editor via the "從範本載入" dropdown grouped by
category.

This doc is a feature-coverage reference so engineers and ops can
quickly find "does the system support X?" without scrolling through
HQ.

## Coverage at a glance

Every calc_type the scoring engine supports is demonstrated:

| calc_type | Demonstrated by |
|---|---|
| `sum_up` | PHQ-9, GAD-7, WHO-5, PSS-10, FAS, sleep_diary, lifestyle_risk, smoking_stage, family_apgar, procrastination, ... |
| `average` | EQ-5D, CSI 親密關係, NPS |
| `weighted` | 睡眠品質量表（mean × 20） |
| `weighted_sum` | ODI 腰背痛, KMI 更年期（per-item weight） |
| `count_above_threshold` | 生活風險, 慢性病風險（不同 threshold） |
| `sum_of_multiple_selection` | 賀爾蒙身型, 飲食習慣, 價值觀傾向 |
| `sum_of_single_selection` | DISC（含 sequence_of_score 補零） |
| `dominant_category` | MBTI 簡版, 運動偏好, 學習風格 VAK |
| `avg_of_sub_question_set_scores` | 心理健康總覽, MBI 工作倦怠 |
| `sum_of_sub_question_set_scores` | Big Five 五大向度（總分聚合） |
| `arithmetic_expression` | 淨情緒指數, NPS（自訂公式） |

Question kinds:

| kind | Demonstrated by |
|---|---|
| `single_selection` | 幾乎全部 |
| `multiple_selection` | 賀爾蒙身型, 飲食習慣, 價值觀傾向 |
| `score`（數值輸入） | NRS 疼痛, 睡眠日記, NPS, 產品偏好（年齡） |
| `text`（自由文字） | NRS 疼痛位置, 睡眠日記備註 |
| `date`（日期） | NRS 疼痛日期, 睡眠日記 |

Question-level extras:

| 功能 | Demonstrated by |
|---|---|
| `reverse_scored` + `score_max` | PSS-10, FAS, MBI 個人成就, 睡眠品質, 拖延 |
| `weight` (per-question) | ODI, KMI |
| `visible_if` 多條件 AND + NumericCondition | 產品偏好, 月經困擾 |

Post-processors:

| 功能 | Demonstrated by |
|---|---|
| `interpretation_bands` | 幾乎全部 |
| `classification_rules` 跨向度 | 心理健康總覽, CSI 親密關係, MBI |

`on_submit_actions` hooks:

| action type | Demonstrated by |
|---|---|
| `set_attribute` | PHQ-9（寫分數）, 戒菸階段（寫階段） |
| `assign_mission` | 心理健康總覽（高壓力派 breathing_practice）, 生活風險（高風險派 starter pack） |
| `transition_journey` | 淨情緒指數（正向時推到 maintenance phase） |

## Categories

8 個分類（HQ TemplateLoader 用 optgroup 顯示）：

- **心理健康** — PHQ-9, GAD-7, 心理健康總覽, WHO-5, PSS-10, 淨情緒指數
- **身體健康** — 睡眠品質, 賀爾蒙身型, EQ-5D, NRS 疼痛, 疲勞 FAS, ODI 腰背痛
- **生活風格** — 生活風險, 慢性病風險, 飲食習慣, 運動偏好, 睡眠日記, 戒菸階段
- **個性 / 類型** — DISC, MBTI 簡版, Big Five, VAK 學習風格, 價值觀
- **關係** — CSI 親密關係, Family APGAR
- **工作 / 學習** — 拖延 TPS, 工作倦怠 MBI
- **女性健康** — 月經困擾, 更年期 KMI
- **行銷 / 偏好** — 產品偏好（跳題）, NPS

## 怎麼用

1. HQ → Product 詳情頁 → 問卷 tab → `+ 新增問卷`
2. 「📋 從範本載入」下拉選一個（feature_tags 會顯示這個範本展示什麼功能）
3. 「載入」按鈕填好 form
4. 改 key 避免衝突 → 改題目 / bands / hooks 變成你自己的 → 儲存

## 加新範本

開 `apps/hq/src/app/products/[id]/questionnaireTemplates.ts`，在 `QUESTIONNAIRE_TEMPLATES` array 結尾加：

```ts
{
  id: 'my_template',
  label: '我的範本',
  description: '示範 / 用途',
  feature_tags: ['sum_up', 'something_new'],
  category: '心理健康',  // 從 TemplateCategory union 挑
  template: { key, name, description, spec, on_submit_actions },
}
```

Push → HQ rebuild → 下拉自動多一個選項。如果新範本展示了之前沒覆蓋到的功能，同步更新這份 doc 的 coverage 表。

## 對應到 backend code

| 功能 | 程式碼位置 |
|---|---|
| 11 種 calc_type 實作 | `backend/src/lib/questionnaire/scoring.ts` |
| Spec 結構 + 驗證 | `backend/src/lib/questionnaire/spec.types.ts`, `spec-validator.ts` |
| `on_submit_actions` 觸發 | `backend/src/services/questionnaire.service.ts` `runAction()` |
| HQ 載入範本 UI | `apps/hq/src/app/products/[id]/ProductQuestionnaireSection.tsx` `TemplateLoader` |
| 範本資料 | `apps/hq/src/app/products/[id]/questionnaireTemplates.ts` |
