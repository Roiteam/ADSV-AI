"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Key, Eye, EyeOff, CheckCircle2, Bot, Globe, Plus, Trash2 } from "lucide-react"

interface WPSite {
  name: string
  domain: string
  username: string
  app_password: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    anthropic_api_key: "",
    openai_api_key: "",
    preferred_model: "claude",
  })
  const [wpSites, setWpSites] = useState<WPSite[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showClaude, setShowClaude] = useState(false)
  const [showOpenai, setShowOpenai] = useState(false)

  useEffect(() => {
    fetch("/api/user/settings")
      .then(r => r.json())
      .then(d => {
        if (d.settings) {
          setSettings({
            anthropic_api_key: d.settings.anthropic_api_key || "",
            openai_api_key: d.settings.openai_api_key || "",
            preferred_model: d.settings.preferred_model || "claude",
          })
          if (d.settings.wordpress_sites) setWpSites(d.settings.wordpress_sites)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, wordpress_sites: wpSites }),
      })
      const json = await res.json()
      if (json.success) setSaved(true)
    } catch { /* ignore */ }
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const maskKey = (key: string) => {
    if (!key || key.length < 10) return key
    return key.slice(0, 7) + "..." + key.slice(-4)
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Impostazioni</h1>
        <p className="text-gray-500">Caricamento...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Impostazioni</h1>
        <p className="text-gray-500 mt-1">Configura le tue API key per l&apos;AI Assistant</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot size={20} />
            AI Assistant — Configurazione Modello
          </CardTitle>
          <p className="text-sm text-gray-500">
            Inserisci le tue API key per abilitare l&apos;AI Assistant. Puoi usare Claude (Anthropic), GPT (OpenAI) o entrambi.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Modello Preferito</label>
            <Select value={settings.preferred_model} onValueChange={v => setSettings({ ...settings, preferred_model: v })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude">Claude (Anthropic) — Consigliato</SelectItem>
                <SelectItem value="openai">GPT-4o (OpenAI)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400 mt-1">Se il modello preferito non ha una chiave, verrà usato l&apos;altro automaticamente</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Key size={14} />
              Anthropic API Key (Claude)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showClaude ? "text" : "password"}
                  value={settings.anthropic_api_key}
                  onChange={e => setSettings({ ...settings, anthropic_api_key: e.target.value })}
                  placeholder="sk-ant-api03-..."
                />
                <button
                  type="button"
                  onClick={() => setShowClaude(!showClaude)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showClaude ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Ottienila su <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">console.anthropic.com</a>
            </p>
            {settings.anthropic_api_key && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle2 size={12} /> Chiave configurata: {maskKey(settings.anthropic_api_key)}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Key size={14} />
              OpenAI API Key (GPT-4o)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showOpenai ? "text" : "password"}
                  value={settings.openai_api_key}
                  onChange={e => setSettings({ ...settings, openai_api_key: e.target.value })}
                  placeholder="sk-proj-..."
                />
                <button
                  type="button"
                  onClick={() => setShowOpenai(!showOpenai)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showOpenai ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Ottienila su <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">platform.openai.com</a>
            </p>
            {settings.openai_api_key && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle2 size={12} /> Chiave configurata: {maskKey(settings.openai_api_key)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2 border-t">
            <Button onClick={handleSave} disabled={saving}>
              <Save size={16} />
              {saving ? "Salvataggio..." : "Salva Impostazioni"}
            </Button>
            {saved && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 size={16} /> Salvato!
              </span>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe size={20} />
            WordPress — Siti collegati
          </CardTitle>
          <p className="text-sm text-gray-500">
            Collega i tuoi siti WordPress per pubblicare landing page e thank page direttamente dal tool.
            Serve un <strong>Application Password</strong> di WordPress (Utenti → Profilo → Password per le applicazioni).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {wpSites.map((site, i) => (
            <div key={i} className="p-4 border rounded-lg space-y-3 relative">
              <button
                onClick={() => setWpSites(wpSites.filter((_, j) => j !== i))}
                className="absolute top-3 right-3 text-red-400 hover:text-red-600"
                title="Rimuovi sito"
              >
                <Trash2 size={16} />
              </button>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Nome sito</label>
                  <Input
                    value={site.name}
                    onChange={e => { const s = [...wpSites]; s[i] = { ...s[i], name: e.target.value }; setWpSites(s) }}
                    placeholder="Il mio sito"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Dominio (con https://)</label>
                  <Input
                    value={site.domain}
                    onChange={e => { const s = [...wpSites]; s[i] = { ...s[i], domain: e.target.value }; setWpSites(s) }}
                    placeholder="https://miosito.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Username WordPress</label>
                  <Input
                    value={site.username}
                    onChange={e => { const s = [...wpSites]; s[i] = { ...s[i], username: e.target.value }; setWpSites(s) }}
                    placeholder="admin"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Application Password</label>
                  <Input
                    type="password"
                    value={site.app_password}
                    onChange={e => { const s = [...wpSites]; s[i] = { ...s[i], app_password: e.target.value }; setWpSites(s) }}
                    placeholder="xxxx xxxx xxxx xxxx"
                  />
                </div>
              </div>
              {site.domain && site.username && site.app_password && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Configurato: {site.domain}
                </p>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() => setWpSites([...wpSites, { name: "", domain: "", username: "", app_password: "" }])}
            className="w-full"
          >
            <Plus size={16} />
            Aggiungi sito WordPress
          </Button>

          <div className="flex items-center gap-3 pt-2 border-t">
            <Button onClick={handleSave} disabled={saving}>
              <Save size={16} />
              {saving ? "Salvataggio..." : "Salva Tutto"}
            </Button>
            {saved && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 size={16} /> Salvato!
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
