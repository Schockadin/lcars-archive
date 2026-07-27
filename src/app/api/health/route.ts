import sql from "@/lib/db";

// Verhindert, dass Next.js die Route zur Build-Zeit statisch rendert
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await sql`SELECT 1`;
    return Response.json({ ok: true, ts: Date.now() });
  } catch (error) {
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
