import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
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

    const table = request.nextUrl.searchParams.get("table")

    if (table === "profiles") {
      const { data } = await serviceClient.from("profiles").select("*").order("created_at")
      return NextResponse.json({ data: data || [] })
    }

    if (table === "fb_ad_accounts") {
      const { data } = await serviceClient.from("fb_ad_accounts").select("*").order("name")
      return NextResponse.json({ data: data || [] })
    }

    if (table === "fb_pixels") {
      const { data } = await serviceClient.from("fb_pixels").select("*").order("name")
      return NextResponse.json({ data: data || [] })
    }

    if (table === "fb_pages") {
      const { data } = await serviceClient.from("fb_pages").select("*").order("name")
      return NextResponse.json({ data: data || [] })
    }

    if (table === "user_account_assignments") {
      const { data } = await serviceClient.from("user_account_assignments").select("*")
      return NextResponse.json({ data: data || [] })
    }

    if (table === "user_pixel_assignments") {
      const { data } = await serviceClient.from("user_pixel_assignments").select("*")
      return NextResponse.json({ data: data || [] })
    }

    if (table === "user_page_assignments") {
      const { data } = await serviceClient.from("user_page_assignments").select("*")
      return NextResponse.json({ data: data || [] })
    }

    return NextResponse.json({ error: "Invalid table" }, { status: 400 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

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

    const { action, table, record, id } = await request.json()

    if (action === "insert") {
      const { data, error } = await serviceClient.from(table).insert(record).select()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ data })
    }

    if (action === "update") {
      const { data, error } = await serviceClient.from(table).update(record).eq("id", id).select()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ data })
    }

    if (action === "delete") {
      const { error } = await serviceClient.from(table).delete().eq("id", id)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
