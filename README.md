# BumpBuddy 🍼

**Pendamping kehamilan — PWA ringan tanpa framework.**

Hitung mundur HPL, catat kontraksi, lacak gerakan bayi, monitor gejala, dan siapkan tas RS. Semua dari satu halaman, tersimpan di perangkat, bisa dipasang kayak app native.

[Live Demo](https://evanyudis.github.io/bumpbuddy)

## Fitur

| Fitur | Fungsi |
|-------|--------|
| **Hitung Mundur** | Live countdown ke HPL + kalkulasi usia kehamilan |
| **Kontraksi** | Timer manual, deteksi pola persalinan, statistik durasi & interval |
| **Gerakan Bayi** | Hitung tendangan, progress bar ke target 10/hari |
| **Gejala** | Catat gejala dengan 1 tap |
| **Tas RS** | Checklist 25 item (dokumen, ibu, bayi, pasangan) |
| **Pengaturan** | Data pribadi, tema light/dark/system, kontak darurat, ekspor data |

## Tech Stack

- **Zero framework** — HTML5 + CSS3 + JavaScript ES6+
- **PWA** — Service Worker (cache-first) + Web Manifest, installable
- **Desain** — OKLCH color tokens, glass morphism, Geist font
- **Penyimpanan** — localStorage (offline-first)
- **Analytics** — PostHog (opsional, via JS snippet)

## Struktur

```
bumpbuddy/
├── index.html      # Semua UI dalam satu file
├── app.js          # Semua logika & state
├── style.css       # Design tokens + responsive
├── sw.js           # Service worker
├── manifest.json   # PWA manifest
└── img/            # Ikon aplikasi
```

## Cara Pakai

1. Buka [BumpBuddy](https://evanyudis.github.io/bumpbuddy) di browser HP
2. Isi data diri (HPL, nama) di onboarding
3. Install ke home screen lewat "Add to Home Screen" (iOS/Android)
4. Selesai — semua data disimpan di perangkat, offline aman

## Dibuat Dengan ❤️

Dibuat untuk Fara, sekarang open source buat siapa aja yang butuh.
