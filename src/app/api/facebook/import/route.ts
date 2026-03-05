import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const FB_API_VERSION = "v21.0"
const FB_BASE = `https://graph.facebook.com/${FB_API_VERSION}`

async function fbGet(endpoint: string, token: string, params: Record<string, string> = {}) {
  const url = new URL(`${FB_BASE}${endpoint}`)
  url.searchParams.set("access_token", token)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
  return data
}

export const maxDuration = 25

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const serviceClient = await createServiceClient()
    const { data: profile } = await serviceClient.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 })

    const { accessToken } = await request.json()
    if (!accessToken) return NextResponse.json({ error: "Token mancante" }, { status: 400 })

    let adAccounts: any[] = []
    try {
      const meData = await fbGet("/me/adaccounts", accessToken, {
        fields: "id,name,account_id,currency,timezone_name,account_status",
        limit: "100",
      })
      adAccounts = meData.data || []
    } catch (e) {
      return NextResponse.json({
        error: `Errore Facebook: ${e instanceof Error ? e.message : "Token non valido o permessi insufficienti"}`,
      }, { status: 400 })
    }

    if (adAccounts.length === 0) {
      return NextResponse.json({
        error: "Nessun account pubblicitario trovato con questo token",
      }, { status: 400 })
    }

    const results = { accounts: 0, pixels: 0, pages: 0, errors: [] as string[] }

    for (const acc of adAccounts) {
      try {
        const { data: existing } = await serviceClient
          .from("fb_ad_accounts")
          .select("id")
          .eq("account_id", acc.id)
          .maybeSingle()

        let dbAccountId: string

        if (existing) {
          dbAccountId = existing.id
          await serviceClient.from("fb_ad_accounts").update({
            name: acc.name,
            access_token: accessToken,
            currency: acc.currency || "EUR",
            timezone: acc.timezone_name || "Europe/Rome",
            status: acc.account_status === 1 ? "active" : "paused",
          }).eq("id", dbAccountId)
        } else {
          const { data: inserted, error: insertErr } = await serviceClient.from("fb_ad_accounts").insert({
            account_id: acc.id,
            name: acc.name,
            access_token: accessToken,
            currency: acc.currency || "EUR",
            timezone: acc.timezone_name || "Europe/Rome",
            status: acc.account_status === 1 ? "active" : "paused",
          }).select("id").single()

          if (insertErr || !inserted) {
            results.errors.push(`Account ${acc.name}: ${insertErr?.message || "insert failed"}`)
            continue
          }
          dbAccountId = inserted.id
        }
        results.accounts++

        try {
          const pixelData = await fbGet(`/${acc.id}/adspixels`, accessToken, { fields: "id,name" })
          for (const px of pixelData.data || []) {
            await serviceClient.from("fb_pixels").upsert({
              pixel_id: px.id,
              name: px.name,
              fb_ad_account_id: dbAccountId,
            }, { onConflict: "pixel_id" })
            results.pixels++
          }
        } catch { /* pixel fetch can fail silently */ }

        try {
          const pageData = await fbGet("/me/accounts", accessToken, { fields: "id,name,access_token" })
          for (const pg of pageData.data || []) {
            await serviceClient.from("fb_pages").upsert({
              page_id: pg.id,
              name: pg.name,
              access_token: pg.access_token,
              fb_ad_account_id: dbAccountId,
            }, { onConflict: "page_id" })
            results.pages++
          }
        } catch { /* page fetch can fail silently */ }
      } catch (e) {
        results.errors.push(`${acc.name}: ${e instanceof Error ? e.message : "error"}`)
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Errore interno del server",
    }, { status: 500 })
  }
}
