import { NextResponse } from 'next/server';
import { Client } from '@line/bot-sdk';

export async function POST(request) {
    try {
        const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
        if (!token) {
            return NextResponse.json({
                success: false,
                error: '尚未設定 LINE_CHANNEL_ACCESS_TOKEN 環境變數。請前往 LINE Developers 後台取得並加入 .env.local'
            }, { status: 400 });
        }

        const formData = await request.formData();
        const imageFile = formData.get('image');

        if (!imageFile) {
            return NextResponse.json({ success: false, error: '請提供一張圖文選單圖片' }, { status: 400 });
        }

        // Convert the uploaded file to a buffer
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const client = new Client({ channelAccessToken: token });

        // 1. Build the rich menu object
        const liffBase = 'https://liff.line.me/';
        const suppsUri = process.env.NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS ? `${liffBase}${process.env.NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS}?path=/supplements` : 'https://supplement-tracker-kappa.vercel.app/supplements';
        const woundsUri = process.env.NEXT_PUBLIC_LIFF_ID_WOUNDS ? `${liffBase}${process.env.NEXT_PUBLIC_LIFF_ID_WOUNDS}` : `${liffBase}${process.env.NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS}?path=/wounds`;
        const bonesUri = process.env.NEXT_PUBLIC_LIFF_ID_BONES ? `${liffBase}${process.env.NEXT_PUBLIC_LIFF_ID_BONES}` : `${liffBase}${process.env.NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS}?path=/bones`;
        const intimacyUri = process.env.NEXT_PUBLIC_LIFF_ID_INTIMACY ? `${liffBase}${process.env.NEXT_PUBLIC_LIFF_ID_INTIMACY}` : `${liffBase}${process.env.NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS}?path=/intimacy`;
        // New modules
        const hormonesUri = `${liffBase}${process.env.NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS}?path=/hormones`;
        const habitsUri = 'https://cofit-habits.example.com'; // Linking to the separate external project as planned

        const richMenu = {
            size: {
                width: 2500,
                height: 1686
            },
            selected: true,
            name: "HQ Universal Health Menu V2",
            chatBarText: "開啟健康中心",
            areas: [
                // Row 1
                {
                    bounds: { x: 0, y: 0, width: 833, height: 843 },
                    action: { type: "uri", uri: suppsUri }
                },
                {
                    bounds: { x: 833, y: 0, width: 834, height: 843 },
                    action: { type: "uri", uri: woundsUri }
                },
                {
                    bounds: { x: 1667, y: 0, width: 833, height: 843 },
                    action: { type: "uri", uri: bonesUri }
                },
                // Row 2
                {
                    bounds: { x: 0, y: 843, width: 833, height: 843 },
                    action: { type: "uri", uri: intimacyUri }
                },
                {
                    bounds: { x: 833, y: 843, width: 834, height: 843 },
                    action: { type: "uri", uri: hormonesUri }
                },
                {
                    bounds: { x: 1667, y: 843, width: 833, height: 843 },
                    action: { type: "uri", uri: habitsUri }
                }
            ]
        };

        // 2. Create the rich menu structure on LINE servers
        const richMenuId = await client.createRichMenu(richMenu);

        // 3. Upload the image to the newly created rich menu ID
        // The image must be JPEG or PNG and exactly the size defined above
        await client.setRichMenuImage(richMenuId, buffer, imageFile.type);

        // 4. Set this rich menu as the default for all users in this channel
        await client.setDefaultRichMenu(richMenuId);

        return NextResponse.json({
            success: true,
            message: '圖文選單已成功建立、上傳並設定為預設！',
            richMenuId: richMenuId
        });

    } catch (error) {
        console.error('Error deploying rich menu:', error.originalError?.response?.data || error);
        return NextResponse.json({ success: false, error: error.message, details: error.originalError?.response?.data }, { status: 500 });
    }
}
