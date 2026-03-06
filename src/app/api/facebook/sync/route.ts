import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getAdAccountCampaigns, getCampaignInsights, parseActions, parseActionValues } from "@/lib/facebook"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const serviceClient = await createServiceClient()
    const body = await request.json().catch(() => ({}))
    const singleAccountId = body.accountId

    const { data: profile } = await serviceClient.from("profiles").select("role").eq("id", user.id).single()
    const isAdmin = profile?.role === "admin"

    let account: any = null

    if (singleAccountId) {
      const { data } = await serviceClient.from("fb_ad_accounts").select("*").eq("id", singleAccountId).single()
      account = data
    } else {
      // If no accountId, get the first active account
      if (isAdmin) {
        const { data } = await serviceClient.from("fb_ad_accounts").select("*").eq("status", "active").limit(1).single()
        account = data
      } else {
        const { data: assignments } = await serviceClient.from("user_account_assignments").select("fb_ad_account_id").eq("user_id", user.id).limit(1)
        if (assignments && assignments.length > 0) {
          const { data } = await serviceClient.from("fb_ad_accounts").select("*").eq("id", assignments[0].fb_ad_account_id).single()
          account = data
        }
      }
    }

    if (!account) {
      return NextResponse.json({ error: "Nessun account trovato" }, { status: 404 })
    }

    const today = new Date().toISOString().split("T")[0]
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    const results = { campaigns: 0, insights: 0, account: account.name, errors: [] as string[] }

    try {
      const campaignsRes = await getAdAccountCampaigns(account.account_id, account.access_token)
      const fbCampaigns = campaignsRes.data || []

      for (const fbCamp of fbCampaigns) {
        await serviceClient.from("campaigns").upsert({
          fb_campaign_id: fbCamp.id,
          fb_ad_account_id: account.id,
          name: fbCamp.name,
          status: fbCamp.status,
          objective: fbCamp.objective,
          daily_budget: fbCamp.daily_budget ? parseInt(fbCamp.daily_budget) : null,
          lifetime_budget: fbCamp.lifetime_budget ? parseInt(fbCamp.lifetime_budget) : null,
          bid_strategy: fbCamp.bid_strategy,
          start_time: fbCamp.start_time,
          stop_time: fbCamp.stop_time,
          created_time: fbCamp.created_time,
          updated_time: fbCamp.updated_time,
          last_synced_at: new Date().toISOString(),
        }, { onConflict: "fb_campaign_id,fb_ad_account_id" })
        results.campaigns++
      }

      const { data: dbCampaigns } = await serviceClient
        .from("campaigns")
        .select("id,fb_campaign_id")
        .eq("fb_ad_account_id", account.id)

      if (dbCampaigns) {
        for (const dbCamp of dbCampaigns) {
          try {
            const insightsRes = await getCampaignInsights(
              dbCamp.fb_campaign_id, account.access_token,
              { since: weekAgo, until: today }
            )
            for (const insight of insightsRes.data || []) {
              const { conversions } = parseActions(insight.actions)
              const { conversionValue } = parseActionValues(insight.action_values)
              const spend = parseFloat(insight.spend || "0")

              await serviceClient.from("campaign_insights").upsert({
                campaign_id: dbCamp.id,
                fb_ad_account_id: account.id,
                date: insight.date_start,
                impressions: parseInt(insight.impressions || "0"),
                clicks: parseInt(insight.clicks || "0"),
                spend,
                reach: parseInt(insight.reach || "0"),
                cpm: parseFloat(insight.cpm || "0"),
                cpc: parseFloat(insight.cpc || "0"),
                ctr: parseFloat(insight.ctr || "0"),
                conversions,
                cost_per_conversion: conversions > 0 ? spend / conversions : 0,
                conversion_value: conversionValue,
                roas: spend > 0 ? conversionValue / spend : 0,
                frequency: parseFloat(insight.frequency || "0"),
                actions: insight.actions,
              }, { onConflict: "campaign_id,date" })
              results.insights++
            }
          } catch { /* skip */ }
        }
      }

      await serviceClient.from("fb_ad_accounts").update({ last_synced_at: new Date().toISOString() }).eq("id", account.id)
    } catch (e) {
      results.errors.push(e instanceof Error ? e.message : "Errore Facebook API")
    }

    // Return list of all account IDs for sequential sync
    let allAccountIds: string[] = []
    if (isAdmin) {
      const { data } = await serviceClient.from("fb_ad_accounts").select("id,name").eq("status", "active")
      allAccountIds = (data || []).map(a => a.id)
    } else {
      const { data: assignments } = await serviceClient.from("user_account_assignments").select("fb_ad_account_id").eq("user_id", user.id)
      allAccountIds = (assignments || []).map(a => a.fb_ad_account_id)
    }

    return NextResponse.json({ success: true, results, allAccountIds })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sync failed" }, { status: 500 })
  }
}
