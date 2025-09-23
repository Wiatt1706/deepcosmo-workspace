import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const token = (await cookies()).get("access_token")?.value;
  if (!token) {
    return NextResponse.json({ code: 401, data: null, msg: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    code: 200,
    data: { id: 1, name: "Deep User", role: "member" },
    msg: "ok",
  });
}
