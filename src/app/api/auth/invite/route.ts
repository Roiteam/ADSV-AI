import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const serviceClient = await createServiceClient()

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 })

    const { email, role } = await request.json()

    const { data, error } = await serviceClient.auth.admin.inviteUserByEmail(email, {
      data: { role: role || "user", full_name: email.split("@")[0] },
      redirectTo: `${request.nextUrl.origin}/auth/callback`,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await serviceClient.from("profiles").upsert({
      id: data.user.id,
      email,
      full_name: email.split("@")[0],
      role: role || "user",
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
