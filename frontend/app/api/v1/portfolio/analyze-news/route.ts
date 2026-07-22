import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120; // Allow Vercel/Next.js to run this route for up to 120s

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Extract headers we need to forward (Cookies for authentication)
        const headersToForward: Record<string, string> = {
            "Content-Type": "application/json",
        };

        const cookieHeader = req.headers.get("cookie");
        if (cookieHeader) headersToForward["cookie"] = cookieHeader;
        
        const authHeader = req.headers.get("authorization");
        if (authHeader) headersToForward["authorization"] = authHeader;

        const res = await fetch("http://127.0.0.1:8000/api/v1/portfolio/analyze-news", {
            method: "POST",
            headers: headersToForward,
            body: JSON.stringify(body),
        });

        // Read as text first to avoid JSON parse crash on HTML/text error pages
        const textData = await res.text();
        let data;
        try {
            data = JSON.parse(textData);
        } catch {
            data = { error: "Non-JSON response from backend", raw: textData };
        }
        
        return NextResponse.json(data, {
            status: res.status,
            headers: {
                "Content-Type": "application/json"
            }
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: "Internal Server Error", details: error.message },
            { status: 500 }
        );
    }
}
