import { NextResponse } from 'next/server';
import { getWoundLogsAdmin } from '@/app/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request, { params }) {
    try {
        const { woundId } = await params;
        const parsedWoundId = parseInt(woundId, 10);
        
        if (isNaN(parsedWoundId)) {
             return NextResponse.json({ error: 'Invalid wound ID' }, { status: 400 });
        }

        // We fetch logs for this wound using the Admin bypass
        // In a real multi-tenant app, we should verify the wound belongs to the patient and the user is an admin.
        const logs = await getWoundLogsAdmin(parsedWoundId);
        
        if (!logs || logs.length === 0) {
            return NextResponse.json({ error: 'No logs available for SOAP generation' }, { status: 400 });
        }

        // Format logs into a timeline string
        const timelineData = logs.map(log => {
            const dateStr = new Date(log.logged_at).toLocaleDateString('zh-TW');
            return `[日期: ${dateStr}]
疼痛指數(NRS): ${log.nrs_pain_score}/10
觀察症狀: ${log.symptoms || '無'}
單日AI摘要: ${log.ai_assessment_summary || '無紀錄'}
病程標籤: ${log.ai_status_label || '穩定'}
---`;
        }).join('\n');

        const prompt = `你是一位專業的外科傷口照護護理師。
請根據以下病患過去數天的「居家傷口照護紀錄」，撰寫一份專業的【護理紀錄 SOAP Note】。
這份 SOAP 將提供給主治醫師快速掌握病患這段時間的居家復原狀況。

【病患居家照護紀錄 (由近到遠)】:
${timelineData}

【請嚴格使用以下 SOAP 格式輸出 (繁體中文)】：
S (Subjective - 主觀資料): 總結病患這段時間回報的痛感變化與主訴症狀(如: 剛開始痛感幾分，現在幾分，有無發燒異味)。
O (Objective - 客觀資料): 總結 AI 連續觀察到的傷口客觀變化(如: 滲出液變化、紅腫消退情況等)。
A (Assessment - 評估): 護理師對於傷口癒合進度的綜合評估(例如: 傷口是否往好的方向發展？是否有潛在風險？)。
P (Plan - 計畫): 建議接下來的照護處置(例如: 繼續維持目前敷料、建議回診、或更改照護方式)。

請直接輸出 SOAP 內容，不要加上任何開場白或自我介紹。`;

        // Use gemini-2.5-flash as it is fast and excellent at text summarization.
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return NextResponse.json({ success: true, soap_note: responseText });

    } catch (error) {
        console.error('Error generating SOAP Note:', error);
        return NextResponse.json({ error: 'Failed to generate SOAP Note' }, { status: 500 });
    }
}
