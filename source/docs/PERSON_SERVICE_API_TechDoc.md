# Person Service — Referensi API (detail)

Dokumen ini menjelaskan **endpoint yang benar-benar diekspos** oleh layanan Go di `source/app/main.go`. File `openapi.yaml` di folder yang sama menggambarkan skenario API yang lebih luas (misalnya CRUD `/persons` dengan ID numerik); **implementasi saat ini** berbeda: fokus utama adalah **health**, **key-value**, dan **atribut orang (terenkripsi)** dengan `personId` bertipe **UUID**.

---

## Daftar isi

1. [Gambaran umum](#1-gambaran-umum)
2. [Konvensi permintaan & respons](#2-konvensi-permintaan--respons)
3. [Variabel lingkungan](#3-variabel-lingkungan)
4. [Health](#4-health)
5. [Key-Value](#5-key-value)
6. [Person attributes](#6-person-attributes)
7. [Format error & kode error](#7-format-error--kode-error)
8. [Keamanan & data sensitif](#8-keamanan--data-sensitif)
9. [Perbedaan dengan OpenAPI statis](#9-perbedaan-dengan-openapi-statis)

---

## 1. Gambaran umum

| Aspek | Nilai |
|--------|--------|
| Framework HTTP | Echo v4 |
| Port default | `3000` (override dengan env `PORT`) |
| Basis path | **Tidak** ada prefix global seperti `/api/v1` |
| Format isi | `application/json` |
| Person ID | **UUID** (string), mis. `123e4567-e89b-12d3-a456-426614174000` |
| Attribute ID | Bilangan bulat 64-bit (path parameter) |

**Grup endpoint:**

- **Publik (tanpa API key):** `GET /health`, `POST/GET/DELETE /api/key-value/...`
- **Person attributes:** semua route di bawah `/persons/...` memerlukan header **`x-api-key`** yang valid.

---

## 2. Konvensi permintaan & respons

### 2.1 Header pelacakan (trace)

Middleware global membaca header GCP (jika ada) dan menyimpan trace di konteks permintaan.

| Header masuk | Keterangan |
|----------------|------------|
| `X-Cloud-Trace-Context` | Konteks trace dari load balancer GCP; di-parse untuk mendapatkan trace ID. |

| Header keluar | Keterangan |
|-----------------|------------|
| `X-Trace-ID` | Trace ID untuk korelasi log dan debugging (selalu di-set; jika tidak ada konteks GCP, dihasilkan UUID baru). |

### 2.2 Autentikasi (hanya `/persons/...`)

| Header | Wajib | Keterangan |
|--------|--------|------------|
| `x-api-key` | Ya | Harus cocok dengan `PERSON_API_KEY_BLUE` atau `PERSON_API_KEY_GREEN` dan mengikuti format di bawah. |

**Format kunci yang diharapkan (regex di server):**

```text
person-service-key-<UUID>
```

`<UUID>` memakai pola 8-4-4-4-12 digit heksadesimal. Jika **kedua** env key tidak terkonfigurasi dengan format valid, server menjawab **503** (lihat kode `API_003_KEYS_NOT_CONFIGURED`).

### 2.3 Struktur error standar

Semua error JSON dari layanan ini memakai bentuk:

```json
{
  "message": "Deskripsi singkat untuk manusia",
  "error_code": "KODE_STABIL_UNTUK_KLIEN"
}
```

Field `error_code` memudahkan penanganan terprogram; daftar lengkap ada di [bagian 7](#7-format-error--kode-error).

---

## 3. Variabel lingkungan

| Variabel | Peran |
|----------|--------|
| `DATABASE_URL` | Connection string PostgreSQL (**wajib** saat startup). |
| `PORT` | Port listen HTTP (default `3000`). |
| `ENCRYPTION_KEY_1` | Kunci untuk enkripsi nilai atribut person (dan audit terkait); jika kosong dipakai nilai default pengembangan (lihat kode). |
| `PERSON_API_KEY_BLUE` | Salah satu API key aktif (rotasi blue/green). |
| `PERSON_API_KEY_GREEN` | Salah satu API key aktif. |

---

## 4. Health

### `GET /health`

Memeriksa konektivitas basis data lewat query health check.

**Respons sukses — `200 OK`**

```json
{
  "status": "healthy"
}
```

**Respons gagal — `500 Internal Server Error`**

```json
{
  "message": "<pesan error dari database>",
  "error_code": "HC_001_HEALTH_CHECK_FAILED"
}
```

---

## 5. Key-Value

Endpoint ini **tidak** memerlukan `x-api-key`. Path memakai **tanda hubung**: `/api/key-value`.

### `POST /api/key-value`

Menyimpan atau memperbarui pasangan key-value.

**Body (JSON)**

| Field | Tipe | Wajib |
|-------|------|--------|
| `key` | string | Ya |
| `value` | string | Ya |

**Respons**

- `201 Created` — key **baru** pertama kali dibuat.
- `200 OK` — key sudah ada (update).

Body sukses berisi `key`, `value`, dan jika tersedia `created_at`, `updated_at` (timestamp).

**Error umum**

| HTTP | `error_code` | Kondisi |
|------|----------------|----------|
| 400 | `KV_001_INVALID_REQUEST_BODY` | JSON tidak valid |
| 400 | `KV_002_MISSING_KEY_OR_VALUE` | `key` atau `value` kosong |
| 500 | `KV_201_FAILED_SET_VALUE` / `KV_202_FAILED_RETRIEVE_VALUE` | Kegagalan DB |

### `GET /api/key-value/:key`

Mengambil nilai menurut `key` di path.

**Respons**

- `200 OK` — objek dengan `key`, `value`, `created_at`, `updated_at` (jika ada).

**Error umum**

| HTTP | `error_code` | Kondisi |
|------|----------------|----------|
| 400 | `KV_003_MISSING_KEY_PARAM` | Parameter key kosong |
| 404 | `KV_101_KEY_NOT_FOUND` | Key tidak ada |

### `DELETE /api/key-value/:key`

Menghapus pasangan key-value.

**Respons**

- `200 OK` — `{ "message": "Key deleted successfully" }`

**Error umum**

| HTTP | `error_code` | Kondisi |
|------|----------------|----------|
| 404 | `KV_101_KEY_NOT_FOUND` | Key tidak ada |
| 500 | `KV_203_FAILED_DELETE_VALUE` | Gagal menghapus |

---

## 6. Person attributes

Semua route di bawah ini memerlukan header **`x-api-key`** yang valid.

**Catatan UUID:** Untuk beberapa operasi, UUID `personId` yang tidak valid dipetakan ke respons **404** “Person not found” (bukan 400), agar konsisten dengan “orang tidak ditemukan”.

### 6.1 Membuat / meng-upsert atribut (collection)

**`POST /persons/:personId/attributes`**  
**`PUT /persons/:personId/attributes`**

Keduanya memanggil handler yang sama: **create atau update** atribut berdasarkan `key` (upsert di lapisan data).

**Path**

| Parameter | Format |
|-----------|--------|
| `personId` | UUID |

**Body (JSON)**

| Field | Tipe | Wajib | Keterangan |
|-------|------|--------|------------|
| `key` | string | Ya | Tidak boleh kosong / hanya spasi |
| `value` | string | Tidak (boleh kosong) | Disimpan apa adanya |
| `meta` | object | Ya | Lihat tabel di bawah |

**Object `meta`**

| Field | Wajib | Keterangan |
|-------|--------|------------|
| `caller` | Ya | Identitas pemanggil (audit) |
| `reason` | Ya | Alasan permintaan (audit) |
| `traceId` | Tidak | Jika diisi **dan tidak kosong**, server mencoba menulis **request log** terenkripsi; kegagalan audit **tidak** membatalkan operasi utama |

**Respons sukses — `201 Created`**

Objek atribut (bukan dibungkus `meta`/`attribute`):

```json
{
  "id": 1,
  "key": "email",
  "value": "user@example.com",
  "version": 1,
  "createdAt": "...",
  "updatedAt": "..."
}
```

`createdAt` / `updatedAt` disertakan hanya jika valid di basis data.

**Error umum (person attributes)**

| HTTP | `error_code` | Kondisi |
|------|----------------|----------|
| 400 | `PA_003_INVALID_REQUEST_BODY` | Body tidak valid |
| 400 | `PA_004_MISSING_KEY` | `key` kosong |
| 400 | `PA_005_MISSING_META` | `meta` hilang |
| 400 | `PA_005_MISSING_META` | `caller` atau `reason` kosong |
| 404 | `PA_001_INVALID_PERSON_ID` | UUID person tidak valid (diperlakukan sebagai tidak ditemukan) |
| 404 | `PA_101_PERSON_NOT_FOUND` | Person tidak ada di DB |
| 500 | `PA_201_FAILED_VERIFY_PERSON` | Gagal verifikasi person |
| 500 | `PA_202_FAILED_CREATE_ATTRIBUTE` | Gagal menyimpan atribut |
| 500 | `PA_203_FAILED_RETRIEVE_ATTRIBUTE` | Gagal membaca atribut setelah simpan |

---

### 6.2 Daftar semua atribut

**`GET /persons/:personId/attributes`**

**Respons sukses — `200 OK`**

**Array** objek atribut (bukan objek dengan property `attributes`):

```json
[
  {
    "id": 1,
    "key": "email",
    "value": "user@example.com",
    "version": 1,
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

**Error umum**

| HTTP | `error_code` | Kondisi |
|------|----------------|----------|
| 404 | `PA_001_INVALID_PERSON_ID` / `PA_101_PERSON_NOT_FOUND` | UUID invalid atau person tidak ada |
| 500 | `PA_204_FAILED_RETRIEVE_ATTRIBUTES` | Gagal membaca daftar |

---

### 6.3 Satu atribut menurut ID

**`GET /persons/:personId/attributes/:attributeId`**

| Parameter | Format |
|-----------|--------|
| `attributeId` | Integer 64-bit |

**Respons sukses — `200 OK`**

Satu objek seperti pada create (termasuk `version`, `createdAt`, `updatedAt` jika ada).

**Error umum**

| HTTP | `error_code` | Kondisi |
|------|----------------|----------|
| 400 | `PA_001_INVALID_PERSON_ID` | Format UUID person salah |
| 400 | `PA_006_INVALID_ATTRIBUTE_ID_FORMAT` | `attributeId` bukan integer |
| 404 | `PA_101_PERSON_NOT_FOUND` | Person tidak ada |
| 404 | `PA_102_ATTRIBUTE_NOT_FOUND` | ID atribut tidak ada untuk person tersebut |
| 500 | `PA_204_FAILED_RETRIEVE_ATTRIBUTES` | Gagal membaca data |

---

### 6.4 Memperbarui atribut

**`PUT /persons/:personId/attributes/:attributeId`**

**Body (JSON)**

| Field | Wajib | Keterangan |
|-------|--------|------------|
| `value` | Implisit ya | Harus ada dan **tidak boleh** hanya whitespace |
| `key` | Tidak | Jika dikirim dan berbeda dari key lama, key lama dihapus dan dibuat entri baru dengan key baru |
| `version` | Tidak | Jika diset, pembaruan memakai **optimistic locking**; konflik → **409** |
| `meta` | Tidak | Tidak divalidasi sama seperti pada create untuk field wajib |

**Perilaku versi**

- Jika `version` **ada**: dipanggil update dengan versi yang diharapkan; jika tidak cocok → **409 Conflict** (`PA_209_VERSION_CONFLICT`).
- Jika `version` **tidak ada**: pembaruan tanpa cek versi (kompatibel ke belakang).

**Respons sukses — `200 OK`**

Objek atribut terbaru (sama bentuknya dengan respons create).

**Error tambahan**

| HTTP | `error_code` | Kondisi |
|------|----------------|----------|
| 409 | `PA_209_VERSION_CONFLICT` | Versi tidak cocok |
| 500 | `PA_208_FAILED_UPDATE_KEY` | Gagal saat mengganti key |
| 500 | `PA_205_FAILED_UPDATE_ATTRIBUTE` | Gagal update lain |
| 500 | `PA_206_FAILED_RETRIEVE_UPDATED` | Gagal membaca setelah update |

---

### 6.5 Menghapus atribut

**`DELETE /persons/:personId/attributes/:attributeId`**

Tidak memerlukan body.

**Respons sukses — `200 OK`**

```json
{
  "message": "Attribute deleted successfully"
}
```

**Error umum**

| HTTP | `error_code` | Kondisi |
|------|----------------|----------|
| 404 | `PA_101_PERSON_NOT_FOUND` | Person tidak ada (pesan bisa "Not found") |
| 404 | `PA_102_ATTRIBUTE_NOT_FOUND` | Atribut tidak ada |
| 500 | `PA_207_FAILED_DELETE_ATTRIBUTE` | Gagal hapus |

---

## 7. Format error & kode error

### 7.1 Middleware API key

| HTTP | `error_code` | Pesan contoh |
|------|----------------|--------------|
| 401 | `API_001_MISSING_API_KEY` | Missing required header "x-api-key" |
| 401 | `API_002_INVALID_API_KEY_FORMAT` | Invalid API key format |
| 503 | `API_003_KEYS_NOT_CONFIGURED` | API keys are not properly configured |
| 401 | `API_004_INVALID_API_KEY` | Invalid API key |

### 7.2 Person attributes (`PA_*`)

| `error_code` | Arti singkat |
|--------------|----------------|
| `PA_001_INVALID_PERSON_ID` | UUID person tidak valid / tidak dikenali |
| `PA_006_INVALID_ATTRIBUTE_ID_FORMAT` | `attributeId` path bukan integer |
| `PA_003_INVALID_REQUEST_BODY` | JSON/bind gagal |
| `PA_004_MISSING_KEY` | Key wajib untuk create |
| `PA_005_MISSING_META` | Meta hilang atau caller/reason kosong (create) |
| `PA_007_MISSING_VALUE` | Value kosong/whitespace untuk update |
| `PA_101_PERSON_NOT_FOUND` | Person tidak ada |
| `PA_102_ATTRIBUTE_NOT_FOUND` | Atribut tidak ada |
| `PA_201`–`PA_208`, `PA_209` | Kegagalan DB atau konflik versi (lihat tabel endpoint) |

### 7.3 Key-value (`KV_*`)

| `error_code` | Arti singkat |
|--------------|----------------|
| `KV_001_INVALID_REQUEST_BODY` | Body tidak valid |
| `KV_002_MISSING_KEY_OR_VALUE` | Key atau value kosong |
| `KV_003_MISSING_KEY_PARAM` | Parameter key hilang |
| `KV_101_KEY_NOT_FOUND` | Key tidak ditemukan |
| `KV_201`–`KV_203` | Kegagalan operasi DB |

### 7.4 Health (`HC_*`)

| `error_code` | Arti singkat |
|--------------|----------------|
| `HC_001_HEALTH_CHECK_FAILED` | Health check DB gagal |

---

## 8. Keamanan & data sensitif

- **Nilai atribut person** disimpan terenkripsi di basis data; kunci enkripsi dari `ENCRYPTION_KEY_1` (atau default dev jika tidak set).
- **Key-value** di endpoint `/api/key-value` **tidak** dilindungi API key; gunakan hanya jika lingkungan jaringan Anda memang mengizinkan akses tersebut.
- **Rotasi kunci API:** dua env (`BLUE` / `GREEN`) memungkinkan pergantian kunci tanpa downtime, asalkan keduanya valid secara format dan salah satu cocok dengan header klien.

---

## 9. Perbedaan dengan OpenAPI statis

File `source/docs/openapi.yaml` (dan salinan di `api_definition.md`) menggambarkan API dengan:

- prefix server `http://localhost:8080/api/v1` dan resource `/persons` ber-ID **integer**;
- skema request dengan `meta.traceId` wajib dan struktur respons yang dibungkus (`PersonResponse`, dll.).

**Implementasi aktual** (lihat `source/app/main.go`):

- Tidak ada prefix `/api/v1`; port default **3000**.
- Tidak ada endpoint HTTP untuk membuat/mengubah/menghapus **entitas person** — hanya **atribut** per `personId` UUID.
- Respons atribut banyak berupa **objek JSON datar** atau **array**, bukan selalu bungkusan OpenAPI.
- Key-value memakai path **`/api/key-value`** (bukan underscore).

Untuk kontrak mesin, utamakan **dokumen ini** dan kode handler; pertimbangkan untuk menyelaraskan `openapi.yaml` di iterasi berikutnya.

---

## Referensi cepat — ringkasan route

| Method | Path | API key |
|--------|------|---------|
| GET | `/health` | Tidak |
| POST | `/api/key-value` | Tidak |
| GET | `/api/key-value/:key` | Tidak |
| DELETE | `/api/key-value/:key` | Tidak |
| POST, PUT | `/persons/:personId/attributes` | Ya |
| GET | `/persons/:personId/attributes` | Ya |
| GET | `/persons/:personId/attributes/:attributeId` | Ya |
| PUT | `/persons/:personId/attributes/:attributeId` | Ya |
| DELETE | `/persons/:personId/attributes/:attributeId` | Ya |

---

*Dokumen ini selaras dengan perilaku kode pada repositori Person Service; jika ada perubahan route atau skema, perbarui bersamaan dengan `main.go` dan handler terkait.*
