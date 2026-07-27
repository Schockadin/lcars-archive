import sql from "@/lib/db";

export async function GET() {
  try {
    await sql`SELECT 1`;
    return Response.json({ ok: true, ts: Date.now() });
  } catch (error) {
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
