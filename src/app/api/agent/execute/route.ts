import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const serviceClient = await createServiceClient()
    const { data: profile } = await serviceClient.from("profiles").select("role").eq("id", user.id).single()
    const isAdmin = profile?.role === "admin"

    const { action, params } = await request.json()

    if (action === "pause_campaign" || action === "activate_campaign") {
      const campaignName = params?.campaignName
      const campaignId = params?.campaignId
      const newStatus = action === "pause_campaign" ? "PAUSED" : "ACTIVE"

      let campaign: any = null
      if (campaignId) {
        const { data } = await serviceClient.from("campaigns").select("*, fb_ad_account:fb_ad_accounts(access_token)").eq("id", campaignId).single()
        campaign = data
      } else if (campaignName) {
        const { data } = await serviceClient.from("campaigns").select("*, fb_ad_account:fb_ad_accounts(access_token)").ilike("name", `%${campaignName}%`).eq("status", "ACTIVE").limit(1).single()
        campaign = data
        if (!campaign) {
          const fb = await serviceClient.from("campaigns").select("*, fb_ad_account:fb_ad_accounts(access_token)").ilike("name", `%${campaignName}%`).limit(1).single()
          campaign = fb.data
        }
      }

      if (!campaign) return NextResponse.json({ success: false, message: `Campagna "${campaignName || campaignId}" non trovata` })

      const token = (campaign.fb_ad_account as any)?.access_token
      if (!token) return NextResponse.json({ success: false, message: "Token mancante per questo account" })

      const fbRes = await fetch(`https://graph.facebook.com/v21.0/${campaign.fb_campaign_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, access_token: token }),
      })

      if (!fbRes.ok) {
        const err = await fbRes.json().catch(() => ({}))
        return NextResponse.json({ success: false, message: err?.error?.message || `Facebook API error ${fbRes.status}` })
      }

      await serviceClient.from("campaigns").update({ status: newStatus }).eq("id", campaign.id)

      return NextResponse.json({
        success: true,
        message: `Campagna "${campaign.name}" ${newStatus === "PAUSED" ? "messa in pausa" : "attivata"} con successo`,
      })
    }

    if (action === "pause_multiple" || action === "activate_multiple") {
      const campaignNames: string[] = params?.campaignNames || []
      const newStatus = action === "pause_multiple" ? "PAUSED" : "ACTIVE"
      const results: string[] = []

      for (const name of campaignNames) {
        const { data: campaign } = await serviceClient.from("campaigns").select("*, fb_ad_account:fb_ad_accounts(access_token)").ilike("name", `%${name}%`).limit(1).single()
        if (!campaign) { results.push(`"${name}": non trovata`); continue }

        const token = (campaign.fb_ad_account as any)?.access_token
        if (!token) { results.push(`"${name}": token mancante`); continue }

        const fbRes = await fetch(`https://graph.facebook.com/v21.0/${campaign.fb_campaign_id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus, access_token: token }),
        })

        if (fbRes.ok) {
          await serviceClient.from("campaigns").update({ status: newStatus }).eq("id", campaign.id)
          results.push(`"${campaign.name}": ${newStatus === "PAUSED" ? "pausata" : "attivata"}`)
        } else {
          results.push(`"${campaign.name}": errore Facebook`)
        }
      }

      return NextResponse.json({ success: true, message: results.join("\n") })
    }

    if (action === "update_budget") {
      const campaignName = params?.campaignName
      const newBudget = params?.budget

      if (!campaignName || !newBudget) return NextResponse.json({ success: false, message: "Nome campagna e budget richiesti" })

      let { data: campaign } = await serviceClient
        .from("campaigns")
        .select("*, fb_ad_account:fb_ad_accounts(access_token)")
        .ilike("name", `%${campaignName}%`)
        .eq("status", "ACTIVE")
        .limit(1)
        .single()

      if (!campaign) {
        const fallback = await serviceClient
          .from("campaigns")
          .select("*, fb_ad_account:fb_ad_accounts(access_token)")
          .ilike("name", `%${campaignName}%`)
          .limit(1)
          .single()
        campaign = fallback.data
      }

      if (!campaign) return NextResponse.json({ success: false, message: `Campagna "${campaignName}" non trovata` })

      const token = (campaign.fb_ad_account as any)?.access_token
      if (!token) return NextResponse.json({ success: false, message: "Token mancante" })

      const budgetCents = Math.round(Number(newBudget) * 100)
      const fbCampaignId = campaign.fb_campaign_id

      const beforeRes = await fetch(
        `https://graph.facebook.com/v21.0/${fbCampaignId}?fields=daily_budget,lifetime_budget,name,budget_rebalance_flag&access_token=${encodeURIComponent(token)}`
      )
      const beforeData = await beforeRes.json().catch(() => null)
      const budgetBefore = beforeData?.daily_budget ? Number(beforeData.daily_budget) : null

      const updateRes = await fetch(
        `https://graph.facebook.com/v21.0/${fbCampaignId}?daily_budget=${budgetCents}&access_token=${encodeURIComponent(token)}`,
        { method: "POST" }
      )
      const updateBody = await updateRes.json().catch(() => null)

      if (!updateRes.ok || updateBody?.error) {
        return NextResponse.json({
          success: false,
          message: `Errore Facebook: ${updateBody?.error?.message || `HTTP ${updateRes.status}`}. Campaign ID: ${fbCampaignId}. Budget prima: €${budgetBefore ? budgetBefore / 100 : "?"}`,
        })
      }

      const afterRes = await fetch(
        `https://graph.facebook.com/v21.0/${fbCampaignId}?fields=daily_budget,name&access_token=${encodeURIComponent(token)}`
      )
      const afterData = await afterRes.json().catch(() => null)
      const budgetAfter = afterData?.daily_budget ? Number(afterData.daily_budget) / 100 : null

      if (budgetAfter !== null && Math.abs(budgetAfter - Number(newBudget)) < 0.01) {
        await serviceClient.from("campaigns").update({ daily_budget: budgetCents }).eq("id", campaign.id)
        return NextResponse.json({
          success: true,
          message: `Budget "${campaign.name}" aggiornato: €${budgetBefore ? budgetBefore / 100 : "?"} → €${budgetAfter}/giorno ✓`,
        })
      }

      return NextResponse.json({
        success: false,
        message: `ATTENZIONE: Facebook ha risposto OK ma il budget NON è cambiato! Campaign ID: ${fbCampaignId}, Budget prima: €${budgetBefore ? budgetBefore / 100 : "?"}, Budget dopo: €${budgetAfter ?? "?"}, Risposta FB: ${JSON.stringify(updateBody)}`,
      })
    }

    if (action === "sync_campaigns") {
      const { data: accounts } = isAdmin
        ? await serviceClient.from("fb_ad_accounts").select("id").eq("status", "active")
        : await serviceClient.from("user_account_assignments").select("fb_ad_account_id").eq("user_id", user.id)

      const ids = isAdmin ? (accounts || []).map((a: any) => a.id) : (accounts || []).map((a: any) => a.fb_ad_account_id)
      let total = 0

      for (const id of ids) {
        try {
          const res = await fetch(new URL("/api/facebook/sync", request.url).toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json", cookie: request.headers.get("cookie") || "" },
            body: JSON.stringify({ accountId: id }),
          })
          const data = await res.json()
          if (data.results) total += data.results.campaigns
        } catch { /* skip */ }
      }

      return NextResponse.json({ success: true, message: `Sincronizzazione completata: ${total} campagne aggiornate da ${ids.length} account` })
    }

    if (action === "get_campaign_details") {
      const campaignName = params?.campaignName
      if (!campaignName) return NextResponse.json({ success: false, message: "Nome campagna richiesto" })

      let { data: campaign } = await serviceClient.from("campaigns").select("*").ilike("name", `%${campaignName}%`).eq("status", "ACTIVE").limit(1).single()
      if (!campaign) {
        const fb = await serviceClient.from("campaigns").select("*").ilike("name", `%${campaignName}%`).limit(1).single()
        campaign = fb.data
      }
      if (!campaign) return NextResponse.json({ success: false, message: `Campagna "${campaignName}" non trovata` })

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      const { data: insights } = await serviceClient.from("campaign_insights").select("*").eq("campaign_id", campaign.id).gte("date", weekAgo).order("date")

      return NextResponse.json({
        success: true,
        campaign,
        insights: insights || [],
        message: `Dettagli campagna "${campaign.name}" caricati`,
      })
    }

    if (action === "sync_traffic_manager") {
      const { data: managers } = await serviceClient.from("traffic_managers").select("*")
      if (!managers || managers.length === 0) return NextResponse.json({ success: false, message: "Nessun Traffic Manager collegato" })

      const today = new Date().toISOString().split("T")[0]
      const monthStart = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`
      const results: string[] = []

      for (const m of managers) {
        try {
          const base = (m.api_base_url || "").replace(/\/$/, "")
          const apiUrl = `${base}/approvalRate/${monthStart}/${today}`
          const headers: Record<string, string> = { "Accept": "application/json" }
          if (m.api_key) headers["x-api-key"] = m.api_key
          if (m.api_secret) headers["x-user-id"] = m.api_secret

          const res = await fetch(apiUrl, { headers })
          if (res.ok) {
            const apiData = await res.json()
            const records = Array.isArray(apiData) ? apiData : apiData?.data || [apiData]
            const safeNum = (v: any) => { const n = Number(v); return isNaN(n) ? 0 : n }
            let totalLeads = 0, totalConfirmed = 0, totalCanceled = 0, totalPending = 0, totalApproved = 0, totalRevenue = 0

            for (const r of records) {
              const l = r.leads || {}
              const c = r.conversions || {}
              const conf = safeNum(l.confirmed?.total)
              const canc = safeNum(l.canceled?.total)
              const pend = safeNum(c.pending?.total ?? l.to_call_back?.total)
              const appr = safeNum(c.approved?.total)
              const doub = safeNum(l.double)
              const trash = safeNum(l.trash)
              totalLeads += conf + canc + pend + doub + trash
              totalConfirmed += conf
              totalCanceled += canc
              totalPending += pend
              totalApproved += appr
              totalRevenue += safeNum(l.confirmed?.payout) + safeNum(c.approved?.payout)
            }

            await serviceClient.from("traffic_manager_data").delete().eq("traffic_manager_id", m.id)
            await serviceClient.from("traffic_manager_data").insert({
              traffic_manager_id: m.id,
              date: today,
              total_conversions: totalLeads,
              approved_conversions: totalApproved > 0 ? totalApproved : totalConfirmed,
              rejected_conversions: totalCanceled,
              pending_conversions: totalPending,
              approval_rate: totalLeads > 0 ? Math.round(((totalApproved > 0 ? totalApproved : totalConfirmed) / totalLeads) * 10000) / 100 : 0,
              revenue: totalRevenue,
              raw_data: apiData,
            })
            await serviceClient.from("traffic_managers").update({ last_synced_at: new Date().toISOString() }).eq("id", m.id)
            results.push(`"${m.name}": ${totalLeads} lead, ${totalConfirmed} confermate, approval ${totalLeads > 0 ? Math.round(((totalApproved > 0 ? totalApproved : totalConfirmed) / totalLeads) * 100) : 0}%`)
          } else {
            results.push(`"${m.name}": errore API ${res.status}`)
          }
        } catch (e) {
          results.push(`"${m.name}": errore connessione`)
        }
      }

      return NextResponse.json({ success: true, message: `Traffic Manager sincronizzato:\n${results.join("\n")}` })
    }

    if (action === "search_offers" || action === "fetch_offers") {
      const { data: managers } = await serviceClient.from("traffic_managers").select("*")
      if (!managers || managers.length === 0) return NextResponse.json({ success: false, message: "Nessun Traffic Manager collegato" })

      const searchId = params?.offerId
      const searchTerm = params?.search

      const allOffers: any[] = []
      for (const m of managers) {
        if (!m.api_base_url || !m.api_key) continue
        try {
          const base = (m.api_base_url || "").replace(/\/$/, "")
          const headers: Record<string, string> = { "Accept": "application/json" }
          if (m.api_key) headers["x-api-key"] = m.api_key
          if (m.api_secret) headers["x-user-id"] = m.api_secret
          const res = await fetch(`${base}/offers`, { headers })
          if (res.ok) {
            const data = await res.json()
            const offers = Array.isArray(data) ? data : data?.data || data?.offers || []
            for (const o of offers) {
              const offer = {
                tm: m.name,
                id: o.id || o.offer_id,
                nome: o.name || o.offer_name,
                stato: o.status,
                paese: o.country || o.geo || o.countries,
                payout: o.payout,
                verticale: o.vertical || o.category,
                descrizione: o.description || o.short_description || "",
                prezzo: o.price || o.user_price || o.product_price || "",
                url: o.url || o.preview_url || "",
                immagine: o.image || o.thumbnail || o.logo || "",
                valuta: o.currency || "",
              }
              if (searchId && String(offer.id) !== String(searchId)) continue
              if (searchTerm && !offer.nome?.toLowerCase().includes(searchTerm.toLowerCase()) && String(offer.id) !== String(searchTerm)) continue
              allOffers.push(offer)
            }
          }
        } catch { /* skip */ }
      }

      if (allOffers.length === 0) {
        return NextResponse.json({ success: true, message: searchId ? `Offerta #${searchId} non trovata nel catalogo` : "Nessuna offerta trovata" })
      }

      if (searchId || (searchTerm && allOffers.length <= 5)) {
        const o = allOffers[0]
        return NextResponse.json({
          success: true,
          message: `Offerta trovata: "${o.nome}" (ID: ${o.id}, Paese: ${o.paese}, Payout: €${o.payout}, Verticale: ${o.verticale}${o.prezzo ? `, Prezzo: ${o.prezzo}` : ""})`,
          type: "offer_detail",
          offers: allOffers,
        })
      }

      return NextResponse.json({
        success: true,
        message: `Trovate ${allOffers.length} offerte dal network`,
        type: "offers",
        offers: allOffers,
      })
    }

    if (action === "publish_wordpress") {
      const wpSiteId = params?.wpSiteId ?? 0
      const pageTitle = params?.pageTitle || "Landing Page"
      const pageType = params?.pageType || "landing"

      const { data: userSettings } = await serviceClient
        .from("user_settings")
        .select("wordpress_sites")
        .eq("user_id", user.id)
        .single()

      const sites = userSettings?.wordpress_sites
      if (!sites || !Array.isArray(sites) || sites.length === 0) {
        return NextResponse.json({ success: false, message: "Nessun sito WordPress configurato. Vai in Impostazioni per aggiungerne uno." })
      }

      const site = sites[Number(wpSiteId)] || sites[0]
      if (!site?.domain || !site?.username || !site?.app_password) {
        return NextResponse.json({ success: false, message: `Sito WordPress "${site?.name || wpSiteId}" non configurato completamente (manca dominio, username o app password)` })
      }

      const htmlContent = params?.htmlContent
      if (!htmlContent) return NextResponse.json({ success: false, message: "Nessun contenuto HTML da pubblicare" })

      const domain = site.domain.replace(/\/$/, "")
      const auth = Buffer.from(`${site.username}:${site.app_password}`).toString("base64")

      try {
        const wpRes = await fetch(`${domain}/wp-json/wp/v2/pages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${auth}`,
          },
          body: JSON.stringify({
            title: pageTitle,
            content: htmlContent,
            status: "publish",
            template: "elementor_canvas",
          }),
        })

        const wpData = await wpRes.json()

        if (!wpRes.ok) {
          return NextResponse.json({
            success: false,
            message: `Errore WordPress: ${wpData?.message || wpRes.status}. Verifica username e Application Password nelle Impostazioni.`,
          })
        }

        return NextResponse.json({
          success: true,
          message: `${pageType === "thank_page" ? "Thank Page" : "Landing Page"} "${pageTitle}" pubblicata su ${site.name}!\nURL: ${wpData.link || `${domain}/?p=${wpData.id}`}\nID Pagina: ${wpData.id}`,
          pageId: wpData.id,
          pageUrl: wpData.link,
        })
      } catch (err: any) {
        return NextResponse.json({ success: false, message: `Errore connessione WordPress: ${err.message}` })
      }
    }

    if (action === "change_lp_offer") {
      const wpSiteId = params?.wpSiteId ?? 0
      const pageId = params?.pageId
      const newContent = params?.htmlContent
      const newOfferUrl = params?.newOfferUrl

      if (!pageId) return NextResponse.json({ success: false, message: "ID pagina WordPress richiesto" })

      const { data: userSettings } = await serviceClient
        .from("user_settings")
        .select("wordpress_sites")
        .eq("user_id", user.id)
        .single()

      const sites = userSettings?.wordpress_sites
      if (!sites || !Array.isArray(sites) || sites.length === 0) {
        return NextResponse.json({ success: false, message: "Nessun sito WordPress configurato" })
      }

      const site = sites[Number(wpSiteId)] || sites[0]
      const domain = site.domain.replace(/\/$/, "")
      const auth = Buffer.from(`${site.username}:${site.app_password}`).toString("base64")

      const updateData: any = {}
      if (newContent) updateData.content = newContent
      if (newOfferUrl) {
        updateData.meta = { offer_url: newOfferUrl }
      }

      try {
        const wpRes = await fetch(`${domain}/wp-json/wp/v2/pages/${pageId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${auth}`,
          },
          body: JSON.stringify(updateData),
        })

        const wpData = await wpRes.json()
        if (!wpRes.ok) {
          return NextResponse.json({ success: false, message: `Errore WordPress: ${wpData?.message || wpRes.status}` })
        }

        return NextResponse.json({
          success: true,
          message: `Pagina ${pageId} aggiornata su ${site.name}. ${newOfferUrl ? `Nuova offerta: ${newOfferUrl}` : "Contenuto aggiornato."}`,
        })
      } catch (err: any) {
        return NextResponse.json({ success: false, message: `Errore: ${err.message}` })
      }
    }

    if (action === "insert_form") {
      const formType = params?.formType || "lead"
      const formFields = params?.formFields || ["nome", "email", "telefono"]
      const lingua = params?.lingua || "it"

      const labels: Record<string, Record<string, string>> = {
        nome: { it: "Nome", es: "Nombre", bg: "Име", pl: "Imię", pt: "Nome", fr: "Nom", de: "Name", ro: "Nume", en: "Name" },
        email: { it: "Email", es: "Correo", bg: "Имейл", pl: "E-mail", pt: "E-mail", fr: "E-mail", de: "E-Mail", ro: "E-mail", en: "Email" },
        telefono: { it: "Telefono", es: "Teléfono", bg: "Телефон", pl: "Telefon", pt: "Telefone", fr: "Téléphone", de: "Telefon", ro: "Telefon", en: "Phone" },
        indirizzo: { it: "Indirizzo", es: "Dirección", bg: "Адрес", pl: "Adres", pt: "Endereço", fr: "Adresse", de: "Adresse", ro: "Adresă", en: "Address" },
        citta: { it: "Città", es: "Ciudad", bg: "Град", pl: "Miasto", pt: "Cidade", fr: "Ville", de: "Stadt", ro: "Oraș", en: "City" },
      }

      const lang = lingua.toLowerCase().substring(0, 2)
      const submitLabel: Record<string, string> = {
        it: "ORDINA ORA", es: "¡PIDE AHORA!", bg: "ПОРЪЧАЙ СЕГА!", pl: "ZAMÓW TERAZ!", pt: "PEÇA AGORA!", fr: "COMMANDEZ!", de: "JETZT BESTELLEN!", ro: "COMANDĂ ACUM!", en: "ORDER NOW!",
      }

      const fieldsHtml = formFields.map((f: string) => {
        const label = labels[f]?.[lang] || labels[f]?.["en"] || f
        return `<input type="${f === "email" ? "email" : "text"}" name="${f}" placeholder="${label}" required style="width:100%;padding:14px;margin:6px 0;border:1px solid #ddd;border-radius:8px;font-size:15px" />`
      }).join("\n")

      const formHtml = `<div style="background:#f8f9fa;padding:32px;border-radius:12px;margin:20px auto;max-width:500px;text-align:center">
<form method="post" action="">
${fieldsHtml}
<button type="submit" style="width:100%;padding:16px;margin-top:12px;background:#e74c3c;color:#fff;border:none;border-radius:8px;font-size:18px;font-weight:bold;cursor:pointer">${submitLabel[lang] || submitLabel["en"]}</button>
</form>
</div>`

      return NextResponse.json({
        success: true,
        message: `Modulo ${formType} generato con ${formFields.length} campi in ${lingua}. Usa questo HTML nella tua landing page.`,
        formHtml,
        type: "form",
      })
    }

    return NextResponse.json({ success: false, message: `Azione "${action}" non supportata` })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error" }, { status: 500 })
  }
}
