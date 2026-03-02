import { NextResponse } from 'next/server';
import { Client } from '@line/bot-sdk';

// This API creates a rich menu that maps to the 4 modules based on their LIFF URIs.
export async function POST(request) {
    try {
        const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
        if (!token) {
            return NextResponse.json({
                success: false,
                error: '尚未設定 LINE_CHANNEL_ACCESS_TOKEN 環境變數。請前往 LINE Developers 後台取得並加入 .env.local'
            }, { status: 400 });
        }

        const client = new Client({ channelAccessToken: token });

        // Build the rich menu object
        const liffBase = 'https://liff.line.me/';
        const woundsUri = process.env.NEXT_PUBLIC_LIFF_ID_WOUNDS ? `${liffBase}${process.env.NEXT_PUBLIC_LIFF_ID_WOUNDS}` : `${liffBase}${process.env.NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS}/wounds`;
        const bonesUri = process.env.NEXT_PUBLIC_LIFF_ID_BONES ? `${liffBase}${process.env.NEXT_PUBLIC_LIFF_ID_BONES}` : `${liffBase}${process.env.NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS}/bones`;
        const suppsUri = process.env.NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS ? `${liffBase}${process.env.NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS}` : 'https://supplement-tracker-kappa.vercel.app/supplements';
        const intimacyUri = process.env.NEXT_PUBLIC_LIFF_ID_INTIMACY ? `${liffBase}${process.env.NEXT_PUBLIC_LIFF_ID_INTIMACY}` : `${liffBase}${process.env.NEXT_PUBLIC_LIFF_ID_SUPPLEMENTS}/intimacy`;

        const richMenu = {
            size: {
                width: 2500,
                height: 1686
            },
            selected: true,
            name: "Health Hub Menu v1",
            chatBarText: "開啟健康中心",
            areas: [
                {
                    bounds: { x: 0, y: 0, width: 1250, height: 843 },
                    action: { type: "uri", uri: woundsUri }
                },
                {
                    bounds: { x: 1250, y: 0, width: 1250, height: 843 },
                    action: { type: "uri", uri: bonesUri }
                },
                {
                    bounds: { x: 0, y: 843, width: 1250, height: 843 },
                    action: { type: "uri", uri: suppsUri }
                },
                {
                    bounds: { x: 1250, y: 843, width: 1250, height: 843 },
                    action: { type: "uri", uri: intimacyUri }
                }
            ]
        };

        // 1. Create the rich menu
        const richMenuId = await client.createRichMenu(richMenu);

        // Note: For a complete integration, we must upload an image to this richMenuId using client.setRichMenuImage
        // and then set it as default using client.setDefaultRichMenu. 
        // For MVP, we'll return the richMenuId created so the user knows it succeeded.

        return NextResponse.json({
            success: true,
            message: '圖文選單座標與網址綁定成功！',
            richMenuId: richMenuId,
            uris: { woundsUri, bonesUri, suppsUri, intimacyUri }
        });

    } catch (error) {
        console.error('Error creating rich menu:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
