import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { postId, postUrl, reportedBy } = await req.json();

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const discordUserId = process.env.DISCORD_OWNER_ID;

    if (!webhookUrl) {
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    const message = discordUserId
      ? `<@${discordUserId}> **Post reported** by \`${reportedBy}\`\n${postUrl}`
      : `**Post reported** by \`${reportedBy}\`\n${postUrl}`;

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
