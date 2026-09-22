# JKT48 Quota Checker

Ekstensi browser dan skrip CLI buat cek ketersediaan kuota tiket / Meet & Greet / 2-Shot JKT48 secara real-time.

---

## Fitur
- Auto-detect kode event dari tab browser yang lagi dibuka.
- Live filter pencarian nama member dan opsi sembunyikan kuota kosong.
- Auto-refresh dengan alarm suara ketika ada kuota restock/tersedia.
- Pakai sesi login browser aktif (bebas Cloudflare block).

---

## Cara Pasang Ekstensi

1. Buka `chrome://extensions` di Google Chrome, Edge, atau Brave.
2. Aktifkan **Developer mode** di pojok kanan atas.
3. Klik **Load unpacked**, lalu pilih folder `extension`.
4. Pin ikon **48** di toolbar browser.

---

## Cara Pakai

1. Buka [jkt48.com](https://jkt48.com) dan pastikan sudah login.
2. Masuk ke halaman tiket/event yang mau dipantau (contoh link: `https://jkt48.com/purchase/exclusive?code=EX5B99`).
3. Buka popup ekstensi **48** (kode event akan terisi otomatis).
4. Klik **Cek Kuota**.
5. Centang **Auto-refresh** kalau mau dipantau otomatis.

---

## Alternatif CLI (Python)

Jika ingin memantau lewat terminal:

```bash
# Install dependencies
pip install curl_cffi

# Cek kuota yang tersedia
python checker.py --code EX5B99 --available

# Mode auto-refresh terminal
python checker.py --code EX5B99 --available --watch --interval 5
```

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Emzyjeppp"><strong>Jeppp</strong></a>
</p>
