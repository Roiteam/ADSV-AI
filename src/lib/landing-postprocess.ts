// Landing page post-processing pipeline ported from Baba Yaga / Agent Hub
// Handles: padding compression, hero image injection, modulo section,
// form template injection, footer, currency replacement, translations

// ===================================================================
// MODULE & FOOTER TRANSLATIONS (20+ languages)
// ===================================================================

interface TranslationEntry {
  moduloHeading: (nome: string) => string
  moduloSubtext: string
  footerTitle: string
  footerTerms: string
  footerPrivacy: string
  footerRefunds: string
  footerContact: string
  formLabels: Record<string, string>
  formButton: string
}

const MODULE_FOOTER_TRANSLATIONS: Record<string, TranslationEntry | null> = {
  Italiano: null,
  Spagnolo: {
    moduloHeading: (n) => `¡COMPLETA EL FORMULARIO PARA RECIBIR ${n.toUpperCase()} CON OFERTA ESPECIAL!`,
    moduloSubtext: "<p style='color:#374151;font-size:16px;'>Un asesor te contactará en menos de 24 horas. <strong>Sin compromiso, consulta gratuita.</strong></p>",
    footerTitle: "Enlaces útiles", footerTerms: "Términos y Condiciones", footerPrivacy: "Política de Privacidad", footerRefunds: "Devoluciones y Reembolsos", footerContact: "Contáctanos",
    formLabels: { "Nome Cognome": "Nombre y Apellido", Nome: "Nombre", Cognome: "Apellido", Telefono: "Teléfono", "Città": "Ciudad", Email: "Correo electrónico", Indirizzo: "Dirección", CAP: "Código Postal" },
    formButton: "Enviar Pedido",
  },
  Inglese: {
    moduloHeading: (n) => `FILL OUT THE FORM TO GET ${n.toUpperCase()} AT A SPECIAL OFFER!`,
    moduloSubtext: "<p style='color:#374151;font-size:16px;'>A consultant will contact you within 24 hours. <strong>No obligation, free consultation.</strong></p>",
    footerTitle: "Useful Links", footerTerms: "Terms and Conditions", footerPrivacy: "Privacy Policy", footerRefunds: "Returns and Refunds", footerContact: "Contact Us",
    formLabels: { "Nome Cognome": "Full Name", Nome: "First Name", Cognome: "Last Name", Telefono: "Phone", "Città": "City", Email: "Email", Indirizzo: "Address", CAP: "Zip Code" },
    formButton: "Submit Order",
  },
  Francese: {
    moduloHeading: (n) => `REMPLISSEZ LE FORMULAIRE POUR RECEVOIR ${n.toUpperCase()} EN OFFRE SPÉCIALE !`,
    moduloSubtext: "<p style='color:#374151;font-size:16px;'>Un conseiller vous contactera sous 24 heures. <strong>Sans engagement, consultation gratuite.</strong></p>",
    footerTitle: "Liens utiles", footerTerms: "Conditions Générales", footerPrivacy: "Politique de Confidentialité", footerRefunds: "Retours et Remboursements", footerContact: "Contactez-nous",
    formLabels: { "Nome Cognome": "Nom et Prénom", Nome: "Prénom", Cognome: "Nom", Telefono: "Téléphone", "Città": "Ville", Email: "E-mail", Indirizzo: "Adresse", CAP: "Code Postal" },
    formButton: "Envoyer la Commande",
  },
  Tedesco: {
    moduloHeading: (n) => `FÜLLEN SIE DAS FORMULAR AUS, UM ${n.toUpperCase()} ZUM SONDERANGEBOT ZU ERHALTEN!`,
    moduloSubtext: "<p style='color:#374151;font-size:16px;'>Ein Berater wird Sie innerhalb von 24 Stunden kontaktieren. <strong>Unverbindlich, kostenlose Beratung.</strong></p>",
    footerTitle: "Nützliche Links", footerTerms: "AGB", footerPrivacy: "Datenschutzrichtlinie", footerRefunds: "Rückgabe und Erstattung", footerContact: "Kontaktieren Sie uns",
    formLabels: { "Nome Cognome": "Vollständiger Name", Nome: "Vorname", Cognome: "Nachname", Telefono: "Telefon", "Città": "Stadt", Email: "E-Mail", Indirizzo: "Adresse", CAP: "PLZ" },
    formButton: "Bestellung absenden",
  },
  Portoghese: {
    moduloHeading: (n) => `PREENCHA O FORMULÁRIO PARA RECEBER ${n.toUpperCase()} EM OFERTA ESPECIAL!`,
    moduloSubtext: "<p style='color:#374151;font-size:16px;'>Um consultor entrará em contato em até 24 horas. <strong>Sem compromisso, consulta gratuita.</strong></p>",
    footerTitle: "Links úteis", footerTerms: "Termos e Condições", footerPrivacy: "Política de Privacidade", footerRefunds: "Devoluções e Reembolsos", footerContact: "Entre em Contato",
    formLabels: { "Nome Cognome": "Nome Completo", Nome: "Nome", Cognome: "Sobrenome", Telefono: "Telefone", "Città": "Cidade", Email: "E-mail", Indirizzo: "Endereço", CAP: "CEP" },
    formButton: "Enviar Pedido",
  },
  Romeno: {
    moduloHeading: (n) => `COMPLETAȚI FORMULARUL PENTRU A PRIMI ${n.toUpperCase()} LA OFERTĂ SPECIALĂ!`,
    moduloSubtext: "<p style='color:#374151;font-size:16px;'>Un consultant vă va contacta în termen de 24 de ore. <strong>Fără obligații, consultanță gratuită.</strong></p>",
    footerTitle: "Linkuri utile", footerTerms: "Termeni și Condiții", footerPrivacy: "Politica de Confidențialitate", footerRefunds: "Returnări și Rambursări", footerContact: "Contactați-ne",
    formLabels: { "Nome Cognome": "Nume și Prenume", Nome: "Prenume", Cognome: "Nume", Telefono: "Telefon", "Città": "Oraș", Email: "E-mail", Indirizzo: "Adresă", CAP: "Cod Poștal" },
    formButton: "Trimite Comanda",
  },
  Polacco: {
    moduloHeading: (n) => `WYPEŁNIJ FORMULARZ, ABY OTRZYMAĆ ${n.toUpperCase()} W OFERCIE SPECJALNEJ!`,
    moduloSubtext: "<p style='color:#374151;font-size:16px;'>Konsultant skontaktuje się z Tobą w ciągu 24 godzin. <strong>Bez zobowiązań, bezpłatna konsultacja.</strong></p>",
    footerTitle: "Przydatne linki", footerTerms: "Regulamin", footerPrivacy: "Polityka Prywatności", footerRefunds: "Zwroty i Reklamacje", footerContact: "Kontakt",
    formLabels: { "Nome Cognome": "Imię i Nazwisko", Nome: "Imię", Cognome: "Nazwisko", Telefono: "Telefon", "Città": "Miasto", Email: "E-mail", Indirizzo: "Adres", CAP: "Kod Pocztowy" },
    formButton: "Wyślij Zamówienie",
  },
  Russo: {
    moduloHeading: (n) => `ЗАПОЛНИТЕ ФОРМУ, ЧТОБЫ ПОЛУЧИТЬ ${n.toUpperCase()} ПО СПЕЦИАЛЬНОЙ ЦЕНЕ!`,
    moduloSubtext: "<p style='color:#374151;font-size:16px;'>Консультант свяжется с вами в течение 24 часов. <strong>Без обязательств, бесплатная консультация.</strong></p>",
    footerTitle: "Полезные ссылки", footerTerms: "Условия", footerPrivacy: "Политика конфиденциальности", footerRefunds: "Возврат", footerContact: "Связаться с нами",
    formLabels: { "Nome Cognome": "Полное имя", Nome: "Имя", Cognome: "Фамилия", Telefono: "Телефон", "Città": "Город", Email: "Эл. почта", Indirizzo: "Адрес", CAP: "Индекс" },
    formButton: "Отправить заказ",
  },
  Bulgaro: {
    moduloHeading: (n) => `ПОПЪЛНЕТЕ ФОРМУЛЯРА, ЗА ДА ПОЛУЧИТЕ ${n.toUpperCase()} НА СПЕЦИАЛНА ЦЕНА!`,
    moduloSubtext: "<p style='color:#374151;font-size:16px;'>Консултант ще се свърже с вас до 24 часа. <strong>Без ангажимент, безплатна консултация.</strong></p>",
    footerTitle: "Полезни връзки", footerTerms: "Общи условия", footerPrivacy: "Политика за поверителност", footerRefunds: "Връщане и възстановяване", footerContact: "Свържете се с нас",
    formLabels: { "Nome Cognome": "Пълно име", Nome: "Име", Cognome: "Фамилия", Telefono: "Телефон", "Città": "Град", Email: "Имейл", Indirizzo: "Адрес", CAP: "Пощенски код" },
    formButton: "Изпрати поръчка",
  },
  Ceco: {
    moduloHeading: (n) => `VYPLŇTE FORMULÁŘ A ZÍSKEJTE ${n.toUpperCase()} VE SPECIÁLNÍ NABÍDCE!`,
    moduloSubtext: "<p style='color:#374151;font-size:16px;'>Konzultant vás bude kontaktovat do 24 hodin. <strong>Bez závazků, bezplatná konzultace.</strong></p>",
    footerTitle: "Užitečné odkazy", footerTerms: "Obchodní podmínky", footerPrivacy: "Ochrana osobních údajů", footerRefunds: "Vrácení a reklamace", footerContact: "Kontaktujte nás",
    formLabels: { "Nome Cognome": "Celé jméno", Nome: "Jméno", Cognome: "Příjmení", Telefono: "Telefon", "Città": "Město", Email: "E-mail", Indirizzo: "Adresa", CAP: "PSČ" },
    formButton: "Odeslat objednávku",
  },
  Ungherese: {
    moduloHeading: (n) => `TÖLTSE KI AZ ŰRLAPOT, HOGY MEGKAPJA ${n.toUpperCase()} SPECIÁLIS AJÁNLATTAL!`,
    moduloSubtext: "<p style='color:#374151;font-size:16px;'>Tanácsadónk 24 órán belül felveszi Önnel a kapcsolatot. <strong>Kötelezettség nélkül, ingyenes konzultáció.</strong></p>",
    footerTitle: "Hasznos linkek", footerTerms: "ÁSZF", footerPrivacy: "Adatvédelem", footerRefunds: "Visszaküldés", footerContact: "Kapcsolat",
    formLabels: { "Nome Cognome": "Teljes név", Nome: "Keresztnév", Cognome: "Vezetéknév", Telefono: "Telefon", "Città": "Város", Email: "E-mail", Indirizzo: "Cím", CAP: "Irányítószám" },
    formButton: "Megrendelés elküldése",
  },
  Croato: {
    moduloHeading: (n) => `ISPUNITE OBRAZAC ZA ${n.toUpperCase()} PO POSEBNOJ PONUDI!`,
    moduloSubtext: "<p style='color:#374151;font-size:16px;'>Konzultant će vas kontaktirati unutar 24 sata. <strong>Bez obveza, besplatno savjetovanje.</strong></p>",
    footerTitle: "Korisne veze", footerTerms: "Uvjeti", footerPrivacy: "Privatnost", footerRefunds: "Povrati", footerContact: "Kontakt",
    formLabels: { "Nome Cognome": "Ime i Prezime", Nome: "Ime", Cognome: "Prezime", Telefono: "Telefon", "Città": "Grad", Email: "E-mail", Indirizzo: "Adresa", CAP: "Poštanski broj" },
    formButton: "Pošalji narudžbu",
  },
  Greco: {
    moduloHeading: (n) => `ΣΥΜΠΛΗΡΩΣΤΕ ΤΗ ΦΟΡΜΑ ΓΙΑ ΝΑ ΛΑΒΕΤΕ ${n.toUpperCase()} ΣΕ ΕΙΔΙΚΗ ΠΡΟΣΦΟΡΑ!`,
    moduloSubtext: "<p style='color:#374151;font-size:16px;'>Ένας σύμβουλος θα επικοινωνήσει μαζί σας εντός 24 ωρών. <strong>Χωρίς δέσμευση, δωρεάν συμβουλευτική.</strong></p>",
    footerTitle: "Χρήσιμοι σύνδεσμοι", footerTerms: "Όροι", footerPrivacy: "Απόρρητο", footerRefunds: "Επιστροφές", footerContact: "Επικοινωνία",
    formLabels: { "Nome Cognome": "Ονοματεπώνυμο", Nome: "Όνομα", Cognome: "Επώνυμο", Telefono: "Τηλέφωνο", "Città": "Πόλη", Email: "E-mail", Indirizzo: "Διεύθυνση", CAP: "Τ.Κ." },
    formButton: "Υποβολή Παραγγελίας",
  },
  Turco: {
    moduloHeading: (n) => `${n.toUpperCase()} ÖZEL TEKLIF İÇİN FORMU DOLDURUN!`,
    moduloSubtext: "<p style='color:#374151;font-size:16px;'>Danışmanımız 24 saat içinde sizinle iletişime geçecektir. <strong>Zorunluluk yok, ücretsiz danışmanlık.</strong></p>",
    footerTitle: "Faydalı Bağlantılar", footerTerms: "Şartlar", footerPrivacy: "Gizlilik", footerRefunds: "İade", footerContact: "Bize Ulaşın",
    formLabels: { "Nome Cognome": "Ad Soyad", Nome: "Ad", Cognome: "Soyad", Telefono: "Telefon", "Città": "Şehir", Email: "E-posta", Indirizzo: "Adres", CAP: "Posta Kodu" },
    formButton: "Siparişi Gönder",
  },
  Ucraino: {
    moduloHeading: (n) => `ЗАПОВНІТЬ ФОРМУ, ЩОБ ОТРИМАТИ ${n.toUpperCase()} ЗА СПЕЦІАЛЬНОЮ ЦІНОЮ!`,
    moduloSubtext: "<p style='color:#374151;font-size:16px;'>Консультант зв'яжеться з вами протягом 24 годин. <strong>Без зобов'язань, безкоштовна консультація.</strong></p>",
    footerTitle: "Корисні посилання", footerTerms: "Умови", footerPrivacy: "Конфіденційність", footerRefunds: "Повернення", footerContact: "Зв'язок",
    formLabels: { "Nome Cognome": "Повне ім'я", Nome: "Ім'я", Cognome: "Прізвище", Telefono: "Телефон", "Città": "Місто", Email: "Ел. пошта", Indirizzo: "Адреса", CAP: "Індекс" },
    formButton: "Надіслати замовлення",
  },
  Slovacco: {
    moduloHeading: (n) => `VYPLŇTE FORMULÁR A ZÍSKAJTE ${n.toUpperCase()} V ŠPECIÁLNEJ PONUKE!`,
    moduloSubtext: "<p style='color:#374151;font-size:16px;'>Konzultant vás bude kontaktovať do 24 hodín.</p>",
    footerTitle: "Užitočné odkazy", footerTerms: "Obchodné podmienky", footerPrivacy: "Ochrana údajov", footerRefunds: "Vrátenie", footerContact: "Kontakt",
    formLabels: { "Nome Cognome": "Celé meno", Nome: "Meno", Cognome: "Priezvisko", Telefono: "Telefón", "Città": "Mesto", Email: "E-mail", Indirizzo: "Adresa", CAP: "PSČ" },
    formButton: "Odoslať objednávku",
  },
  Sloveno: {
    moduloHeading: (n) => `IZPOLNITE OBRAZEC IN PREJMITE ${n.toUpperCase()} PO POSEBNI PONUDBI!`,
    moduloSubtext: "<p style='color:#374151;font-size:16px;'>Svetovalec vas bo kontaktiral v 24 urah.</p>",
    footerTitle: "Uporabne povezave", footerTerms: "Pogoji", footerPrivacy: "Zasebnost", footerRefunds: "Vračila", footerContact: "Kontakt",
    formLabels: { "Nome Cognome": "Ime in Priimek", Nome: "Ime", Cognome: "Priimek", Telefono: "Telefon", "Città": "Mesto", Email: "E-pošta", Indirizzo: "Naslov", CAP: "Poštna št." },
    formButton: "Pošlji naročilo",
  },
  Albanese: {
    moduloHeading: (n) => `PLOTËSONI FORMULARIN PËR TË MARRË ${n.toUpperCase()} ME OFERTË SPECIALE!`,
    moduloSubtext: "<p style='color:#374151;font-size:16px;'>Një konsulent do t'ju kontaktojë brenda 24 orëve.</p>",
    footerTitle: "Lidhje të dobishme", footerTerms: "Termat", footerPrivacy: "Privatësia", footerRefunds: "Kthimet", footerContact: "Na Kontaktoni",
    formLabels: { "Nome Cognome": "Emri dhe Mbiemri", Nome: "Emri", Cognome: "Mbiemri", Telefono: "Telefoni", "Città": "Qyteti", Email: "E-mail", Indirizzo: "Adresa", CAP: "Kodi Postar" },
    formButton: "Dërgo Porosinë",
  },
  Serbo: {
    moduloHeading: (n) => `ПОПУНИТЕ ФОРМУЛАР ДА ДОБИЈЕТЕ ${n.toUpperCase()} ПО СПЕЦИЈАЛНОЈ ПОНУДИ!`,
    moduloSubtext: "<p style='color:#374151;font-size:16px;'>Консултант ће вас контактирати у року од 24 сата.</p>",
    footerTitle: "Корисни линкови", footerTerms: "Услови", footerPrivacy: "Приватност", footerRefunds: "Повраћај", footerContact: "Контакт",
    formLabels: { "Nome Cognome": "Пуно име", Nome: "Име", Cognome: "Презиме", Telefono: "Телефон", "Città": "Град", Email: "Е-пошта", Indirizzo: "Адреса", CAP: "Поштански број" },
    formButton: "Пошаљи",
  },
  Olandese: {
    moduloHeading: (n) => `VUL HET FORMULIER IN OM ${n.toUpperCase()} MET SPECIALE AANBIEDING TE ONTVANGEN!`,
    moduloSubtext: "<p style='color:#374151;font-size:16px;'>Een adviseur neemt binnen 24 uur contact met u op.</p>",
    footerTitle: "Handige links", footerTerms: "Voorwaarden", footerPrivacy: "Privacybeleid", footerRefunds: "Retourzendingen", footerContact: "Contact",
    formLabels: { "Nome Cognome": "Volledige naam", Nome: "Voornaam", Cognome: "Achternaam", Telefono: "Telefoon", "Città": "Stad", Email: "E-mail", Indirizzo: "Adres", CAP: "Postcode" },
    formButton: "Bestelling versturen",
  },
  Lituano: {
    moduloHeading: (n) => `UŽPILDYKITE FORMĄ IR GAUKITE ${n.toUpperCase()} SPECIALIU PASIŪLYMU!`,
    moduloSubtext: "<p style='color:#374151;font-size:16px;'>Konsultantas susisieks su jumis per 24 valandas.</p>",
    footerTitle: "Naudingos nuorodos", footerTerms: "Sąlygos", footerPrivacy: "Privatumas", footerRefunds: "Grąžinimai", footerContact: "Susisiekite",
    formLabels: { "Nome Cognome": "Vardas ir Pavardė", Nome: "Vardas", Cognome: "Pavardė", Telefono: "Telefonas", "Città": "Miestas", Email: "El. paštas", Indirizzo: "Adresas", CAP: "Pašto kodas" },
    formButton: "Siųsti užsakymą",
  },
  Lettone: {
    moduloHeading: (n) => `AIZPILDIET VEIDLAPU, LAI SAŅEMTU ${n.toUpperCase()} AR ĪPAŠU PIEDĀVĀJUMU!`,
    moduloSubtext: "<p style='color:#374151;font-size:16px;'>Konsultants sazināsies ar jums 24 stundu laikā.</p>",
    footerTitle: "Noderīgas saites", footerTerms: "Noteikumi", footerPrivacy: "Privātums", footerRefunds: "Atmaksa", footerContact: "Sazinieties",
    formLabels: { "Nome Cognome": "Pilns vārds", Nome: "Vārds", Cognome: "Uzvārds", Telefono: "Tālrunis", "Città": "Pilsēta", Email: "E-pasts", Indirizzo: "Adrese", CAP: "Pasta indekss" },
    formButton: "Nosūtīt pasūtījumu",
  },
  Estone: {
    moduloHeading: (n) => `TÄITKE VORM JA SAAGE ${n.toUpperCase()} ERIPAKKUMISEGA!`,
    moduloSubtext: "<p style='color:#374151;font-size:16px;'>Konsultant võtab teiega ühendust 24 tunni jooksul.</p>",
    footerTitle: "Kasulikud lingid", footerTerms: "Tingimused", footerPrivacy: "Privaatsus", footerRefunds: "Tagastamine", footerContact: "Võtke ühendust",
    formLabels: { "Nome Cognome": "Täisnimi", Nome: "Eesnimi", Cognome: "Perekonnanimi", Telefono: "Telefon", "Città": "Linn", Email: "E-post", Indirizzo: "Aadress", CAP: "Postiindeks" },
    formButton: "Saada tellimus",
  },
  Arabo: {
    moduloHeading: (n) => `!املأ النموذج للحصول على ${n.toUpperCase()} بعرض خاص`,
    moduloSubtext: "<p style='color:#374151;font-size:16px;'>سيتواصل معك مستشار خلال 24 ساعة.</p>",
    footerTitle: "روابط مفيدة", footerTerms: "الشروط", footerPrivacy: "الخصوصية", footerRefunds: "الاسترداد", footerContact: "اتصل بنا",
    formLabels: { "Nome Cognome": "الاسم الكامل", Nome: "الاسم", Cognome: "اللقب", Telefono: "الهاتف", "Città": "المدينة", Email: "البريد", Indirizzo: "العنوان", CAP: "الرمز البريدي" },
    formButton: "إرسال الطلب",
  },
}

function getModuleFooterTranslation(lingua: string | null | undefined): TranslationEntry | null {
  if (!lingua || lingua === "Italiano") return null
  if (MODULE_FOOTER_TRANSLATIONS[lingua]) return MODULE_FOOTER_TRANSLATIONS[lingua]!
  for (const [lang, trans] of Object.entries(MODULE_FOOTER_TRANSLATIONS)) {
    if (trans && lingua.toLowerCase().includes(lang.toLowerCase().substring(0, 4))) return trans
  }
  return MODULE_FOOTER_TRANSLATIONS["Inglese"]!
}

// ===================================================================
// GEO → LINGUA mapping (lingua names in Italian, matching translation keys)
// ===================================================================

const GEO_TO_LINGUA: Record<string, string> = {
  ES: "Spagnolo", IT: "Italiano", BG: "Bulgaro", PL: "Polacco", PT: "Portoghese",
  FR: "Francese", DE: "Tedesco", RO: "Romeno", CZ: "Ceco", GR: "Greco",
  HR: "Croato", HU: "Ungherese", SK: "Slovacco", SI: "Sloveno", RS: "Serbo",
  TR: "Turco", NL: "Olandese", SE: "Inglese", NO: "Inglese", DK: "Inglese",
  FI: "Inglese", UK: "Inglese", US: "Inglese", GB: "Inglese", RU: "Russo",
  UA: "Ucraino", AL: "Albanese", LT: "Lituano", LV: "Lettone", EE: "Estone",
  SA: "Arabo", BR: "Portoghese", MX: "Spagnolo", AR: "Spagnolo", CL: "Spagnolo", CO: "Spagnolo",
}

export function resolveLanguageName(lingua: string | undefined, geo: string | undefined): string {
  if (lingua) {
    if (GEO_TO_LINGUA[lingua.toUpperCase()]) return GEO_TO_LINGUA[lingua.toUpperCase()]
    for (const val of Object.values(GEO_TO_LINGUA)) {
      if (lingua.toLowerCase().includes(val.toLowerCase().substring(0, 4))) return val
    }
    return lingua
  }
  if (geo) {
    const code = geo.toUpperCase().split(",")[0].trim()
    return GEO_TO_LINGUA[code] || "Inglese"
  }
  return "Italiano"
}

// ===================================================================
// COMPRESS SECTION PADDING
// ===================================================================

function compressSectionPadding(landingJson: any): any {
  if (!landingJson) return landingJson
  const sections = landingJson.content || landingJson.sections || landingJson.elements
  if (!Array.isArray(sections)) return landingJson
  const MAX_PAD = 15

  function clampPad(obj: any, isFirst: boolean) {
    if (!obj) return
    if (isFirst) obj.top = "0"
    else if ((parseInt(obj.top) || 0) > MAX_PAD) obj.top = String(MAX_PAD)
    if ((parseInt(obj.bottom) || 0) > MAX_PAD) obj.bottom = String(MAX_PAD)
  }

  function processElements(elements: any[], depth: number) {
    if (!Array.isArray(elements)) return
    elements.forEach((el, idx) => {
      if (el.settings) {
        const isFirst = depth === 0 && idx === 0
        ;["padding", "_padding", "margin", "_margin"].forEach((k) => {
          if (el.settings[k]) clampPad(el.settings[k], isFirst)
        })
      }
      if (el.elements) processElements(el.elements, depth + 1)
    })
  }

  processElements(sections, 0)
  return landingJson
}

// ===================================================================
// INJECT PRODUCT IMAGE IN HERO
// ===================================================================

function injectProductImageHero(landingJson: any, productImageUrl: string): any {
  if (!landingJson) return landingJson
  const sections = landingJson.content || landingJson.elements
  if (!Array.isArray(sections) || sections.length === 0) return landingJson

  let replaced = false

  function findAndMark(elements: any[]) {
    if (replaced || !Array.isArray(elements)) return
    for (let i = 0; i < elements.length; i++) {
      if (replaced) return
      const el = elements[i]
      if (el.widgetType === "image" && el.settings) {
        el.id = "hero-product-benefits"
        if (!el.settings.image) el.settings.image = {}
        el.settings.image.url = productImageUrl
        el.settings.image.id = ""
        el.settings.image_size = "full"
        el.settings.width = { unit: "%", size: 100, sizes: [] }
        el.settings.align = "center"
        replaced = true
        return
      }
      if (el.elements) findAndMark(el.elements)
    }
  }

  for (let s = 0; s < Math.min(2, sections.length) && !replaced; s++) {
    if (sections[s].elements) findAndMark(sections[s].elements)
  }
  return landingJson
}

// ===================================================================
// ENSURE MODULO (form) SECTION EXISTS
// ===================================================================

function ensureModuloSection(landingJson: any, productData: any, lingua: string): any {
  if (!landingJson?.content || !Array.isArray(landingJson.content)) return landingJson
  const result = JSON.parse(JSON.stringify(landingJson))
  const sections = result.content

  const existingIdx = sections.findIndex((s: any) => s.settings?.css_id === "modulo")
  if (existingIdx >= 0) {
    sections.push(sections.splice(existingIdx, 1)[0])
    return result
  }

  for (let i = 0; i < sections.length; i++) {
    if ((sections[i].id || "").toLowerCase().includes("modulo")) {
      const m = sections.splice(i, 1)[0]
      if (!m.settings) m.settings = {}
      m.settings.css_id = "modulo"
      sections.push(m)
      return result
    }
  }

  const nome = productData?.nome || "il prodotto"
  const trans = getModuleFooterTranslation(lingua)
  const headingText = trans
    ? trans.moduloHeading(nome)
    : `COMPILA IL MODULO PER RICEVERE ${nome.toUpperCase()} IN OFFERTA SPECIALE`
  const subText = trans
    ? trans.moduloSubtext
    : "<p style='color:#374151;font-size:16px;'>Un nostro consulente ti contatterà entro 24 ore. <strong>Nessun impegno.</strong></p>"

  const rnd = () => Math.random().toString(36).substring(2, 8)

  sections.push({
    id: `modulo-${rnd()}`,
    elType: "section",
    settings: {
      css_id: "modulo",
      structure: "10",
      background_background: "classic",
      background_color: "#f0fdf4",
      padding: { unit: "px", top: "15", bottom: "15", left: "20", right: "20", isLinked: false },
    },
    elements: [
      {
        id: `mc-${rnd()}`,
        elType: "column",
        settings: { _inline_size: 100 },
        elements: [
          {
            id: `mh-${rnd()}`,
            elType: "widget",
            widgetType: "heading",
            settings: {
              title: headingText,
              header_size: "h2",
              align: "center",
              title_color: "#dc2626",
              typography_typography: "custom",
              typography_font_weight: "800",
              typography_font_size: { size: 26, unit: "px" },
            },
          },
          {
            id: `ms-${rnd()}`,
            elType: "widget",
            widgetType: "text-editor",
            settings: { editor: subText, align: "center", text_color: "#374151" },
          },
        ],
      },
    ],
  })

  return result
}

// ===================================================================
// INJECT FORM TEMPLATE FROM TRAFFIC MANAGER
// ===================================================================

export function injectFormTemplate(
  landingJson: any,
  formModuleJson: any,
  offerId?: string | number,
  lpId?: string | number,
  lingua?: string
): any {
  if (!formModuleJson) return landingJson

  let templateJson: any
  try {
    let raw = typeof formModuleJson === "string" ? formModuleJson : JSON.stringify(formModuleJson)
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1)
    templateJson = typeof formModuleJson === "string" ? JSON.parse(raw) : formModuleJson
  } catch {
    return landingJson
  }

  function findFormWidgets(el: any): any[] {
    const found: any[] = []
    if (!el) return found
    if (el.widgetType === "form") {
      found.push(JSON.parse(JSON.stringify(el)))
      return found
    }
    ;(el.elements || []).forEach((c: any) => found.push(...findFormWidgets(c)))
    ;(el.content || []).forEach((c: any) => found.push(...findFormWidgets(c)))
    return found
  }

  const formWidgets = findFormWidgets(templateJson)
  if (formWidgets.length === 0) return landingJson

  formWidgets.forEach((fw: any) => {
    ;(fw.settings?.form_fields || []).forEach((f: any) => {
      if (f.field_type === "hidden") {
        const cid = (f.custom_id || "").toLowerCase()
        const label = (f.field_label || "").toLowerCase()
        if (cid === "offer" || label === "offer") f.field_value = String(offerId || "")
        if (cid === "lp" || cid === "ip" || label === "lp" || label === "ip") f.field_value = String(lpId || offerId || "")
      }
    })
  })

  const formTrans = getModuleFooterTranslation(lingua)
  if (formTrans?.formLabels) {
    formWidgets.forEach((fw: any) => {
      ;(fw.settings?.form_fields || []).forEach((f: any) => {
        if (f.field_type === "hidden") return
        if (formTrans.formLabels[f.field_label]) f.field_label = formTrans.formLabels[f.field_label]
      })
      if (formTrans.formButton && fw.settings) {
        if (fw.settings.button_text) fw.settings.button_text = formTrans.formButton
        if (fw.settings.submit_button_text) fw.settings.submit_button_text = formTrans.formButton
      }
    })
  }

  function regenerateIds(el: any) {
    el.id = Math.random().toString(36).substring(2, 10)
    ;(el.elements || []).forEach((c: any) => regenerateIds(c))
  }
  formWidgets.forEach((fw: any) => regenerateIds(fw))

  const result = JSON.parse(JSON.stringify(landingJson))
  const contentArr = result.content || []
  let inserted = false

  for (let i = 0; i < contentArr.length; i++) {
    if (contentArr[i].settings?.css_id === "modulo" && contentArr[i].elements?.[0]?.elements) {
      contentArr[i].elements[0].elements.push(...formWidgets)
      inserted = true
      break
    }
  }

  if (!inserted) {
    const insertIdx = Math.max(1, Math.floor(contentArr.length * 0.55))
    if (contentArr[insertIdx]?.elements?.[0]?.elements) {
      contentArr[insertIdx].elements[0].elements.push(...formWidgets)
      if (!contentArr[insertIdx].settings) contentArr[insertIdx].settings = {}
      contentArr[insertIdx].settings.css_id = "modulo"
    }
  }

  result.content = contentArr
  return result
}

// ===================================================================
// FOOTER TEMPLATE (Elementor JSON)
// ===================================================================

const FOOTER_TEMPLATE = {
  id: "ft-footer",
  elType: "section" as const,
  settings: {
    structure: "20",
    background_background: "classic",
    background_color: "#000000",
    padding: { unit: "px", top: "30", right: "0", bottom: "30", left: "0", isLinked: false },
  },
  elements: [
    {
      id: "ft-col1",
      elType: "column" as const,
      settings: { _column_size: 50, _inline_size: 50 },
      elements: [
        { id: "ft-h1", elType: "widget" as const, widgetType: "heading", settings: { title: "Link utili", title_color: "#FFFFFF", typography_typography: "custom", typography_font_size: { unit: "px", size: 24 }, typography_font_weight: "600", align: "left" }, elements: [] },
        { id: "ft-h2", elType: "widget" as const, widgetType: "heading", settings: { title: "Termini Generali e Condizioni", title_color: "#FFFFFF", typography_typography: "custom", typography_font_size: { unit: "px", size: 15 }, typography_font_weight: "400", align: "left", link: { url: "#" } }, elements: [] },
        { id: "ft-h3", elType: "widget" as const, widgetType: "heading", settings: { title: "Privacy policy e Protezione dei Dati", title_color: "#FFFFFF", typography_typography: "custom", typography_font_size: { unit: "px", size: 15 }, typography_font_weight: "400", align: "left", link: { url: "#" } }, elements: [] },
        { id: "ft-h4", elType: "widget" as const, widgetType: "heading", settings: { title: "Resi e Rimborsi", title_color: "#FFFFFF", typography_typography: "custom", typography_font_size: { unit: "px", size: 15 }, typography_font_weight: "400", align: "left", link: { url: "#" } }, elements: [] },
        { id: "ft-h5", elType: "widget" as const, widgetType: "heading", settings: { title: "Contattaci", title_color: "#FFFFFF", typography_typography: "custom", typography_font_size: { unit: "px", size: 15 }, typography_font_weight: "400", align: "left", link: { url: "#" } }, elements: [] },
      ],
    },
    {
      id: "ft-col2",
      elType: "column" as const,
      settings: { _column_size: 50, _inline_size: 50 },
      elements: [],
    },
  ],
}

function appendFooterTemplate(landingJson: any, lingua: string): any {
  try {
    const result = JSON.parse(JSON.stringify(landingJson))
    const footer = JSON.parse(JSON.stringify(FOOTER_TEMPLATE))

    function regen(el: any) {
      el.id = Math.random().toString(36).substring(2, 10)
      ;(el.elements || []).forEach((c: any) => regen(c))
    }
    regen(footer)

    const trans = getModuleFooterTranslation(lingua)
    if (trans) {
      const map: Record<string, string> = {
        "Link utili": trans.footerTitle,
        "Termini Generali e Condizioni": trans.footerTerms,
        "Privacy policy e Protezione dei Dati": trans.footerPrivacy,
        "Resi e Rimborsi": trans.footerRefunds,
        Contattaci: trans.footerContact,
      }
      function tr(el: any) {
        if (el.settings?.title && map[el.settings.title]) el.settings.title = map[el.settings.title]
        ;(el.elements || []).forEach((c: any) => tr(c))
      }
      tr(footer)
    }

    if (result.content && Array.isArray(result.content)) result.content.push(footer)
    return result
  } catch {
    return landingJson
  }
}

// ===================================================================
// MAIN POST-PROCESSING PIPELINE
// ===================================================================

export interface PostProcessOptions {
  productData: {
    nome?: string
    currency?: string
    currencySymbol?: string
    offerImage?: string
    productImages?: { thumbnail?: string }[]
    offerId?: string | number
    selectedLpId?: string | number
  }
  lingua: string
  formModuleJson?: any
}

export function postProcessLanding(landingJson: any, options: PostProcessOptions): any {
  const { productData: pd, lingua, formModuleJson } = options

  let json = compressSectionPadding(landingJson)

  if (pd.currency && pd.currency !== "EUR" && pd.currencySymbol) {
    json = JSON.parse(JSON.stringify(json).replace(/€/g, pd.currencySymbol))
  }

  const heroImg = pd.offerImage || pd.productImages?.[0]?.thumbnail || null
  if (heroImg) json = injectProductImageHero(json, heroImg)

  json = ensureModuloSection(json, pd, lingua)

  if (formModuleJson && pd.offerId) {
    const lpId = pd.selectedLpId || pd.offerId
    json = injectFormTemplate(json, formModuleJson, pd.offerId, lpId, lingua)
  }

  json = appendFooterTemplate(json, lingua)

  return json
}
