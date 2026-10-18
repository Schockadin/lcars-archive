import sql from "@/lib/db";


export async function GET() {
  try {
    await sql`SELECT 1`;
    return Response.json({ ok: true, ts: Date.now() });
  } catch (error) {
    console.error("Healthcheck: Datenbankverbindung fehlgeschlagen.", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
