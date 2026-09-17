# Pixelsetu Dox — Backend API Design

> **Version:** v1  
> **Base URL:** `https://app.pixelsetu.app`  
> **Content-Type:** `application/json` (all endpoints)  
> **Auth header:** `Authorization: Bearer <accessToken>`

---

## Design Principles

- **Local-first, sync second** — `localStorage` is always the primary store; the server is a sync target.
- **On-demand loading** — topics load at startup; page stubs load when a topic is expanded; page content loads only when the user selects that page.
- **Orientation is a global user preference** — never stored per-page; synced once through the user preferences endpoint.
- **Split metadata from content** — `PATCH /pages/:id/meta` and `PATCH /pages/:id/content` are separate so bulk sync never has to transmit large TipTap documents.

---

## Loading Hierarchy

```
App starts
 └─ GET /topics                         ← all topics (no pages, no content)

User expands a topic
 └─ GET /topics/:id/pages               ← page stubs (id, title, locked, updatedAt — no content)

User clicks a page
 └─ GET /pages/:id/content              ← full TipTap JSON content for that page only
```

---

## 1. Authentication

### `POST /auth/google`

Exchange a Google OAuth one-time code for server-issued tokens. The Google popup / redirect delivers `code` to the frontend; this call happens once per login.

**Request**

```json
{
  "code": "4/0AfJohXn…"
}
```

**Response `200`**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…",
  "expiresIn": 900
}
```

- Access token lifetime: **15 minutes** (kept in memory, never `localStorage`).
- Refresh token: set as `HttpOnly; Secure; SameSite=Strict` cookie — not visible to JS.
- Replace the dummy `setTimeout` in `src/components/LoginScreen.tsx` with a real call here.

---

### `POST /auth/refresh`

Silently re-issue an access token using the HttpOnly cookie. Call this on tab focus when the in-memory access token is expired.

**Request** — no body; cookie is sent automatically.

**Response `200`**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…",
  "expiresIn": 900
}
```

**Response `401`** — cookie is invalid/expired → clear session, show login screen.

---

### `DELETE /auth/session`

Revoke the refresh token (server-side blacklist or deletion). Logout.

**Response `204`** — no body.

---

## 2. User Profile & Preferences

### `GET /users/me`

Fetch the current user's profile. Called once after login to populate `src/contexts/userContext.ts` (replace the hardcoded `CURRENT_USER` constant).

**Response `200`**

```json
{
  "id": "usr_abc123",
  "firstName": "Ritwik",
  "lastName": "Das",
  "username": "ritwik",
  "email": "ritwik@example.com",
  "avatarUrl": "https://lh3.googleusercontent.com/…",
  "storageUsedBytes": 4200000,
  "storageLimitBytes": 104857600
}
```

---

### `PATCH /users/me`

Update display name or username.

**Request** (all fields optional)

```json
{
  "firstName": "Ritwik",
  "lastName": "Das",
  "username": "ritwik"
}
```

**Response `200`** — updated user object (same shape as `GET /users/me`).

---

### `GET /users/me/preferences`

Fetch persisted user preferences. Orientation lives here, not on individual pages.

**Response `200`**

```json
{
  "orientation": "portrait",
  "theme": "dark"
}
```

`orientation` values: `"portrait"` | `"landscape"` | `"fullscreen"`  
`theme`: any valid theme id from `src/data/themes.ts`

---

### `PATCH /users/me/preferences`

Persist preferences. Call this whenever the user changes orientation or theme (same debounce pattern as content save).

**Request** (all fields optional)

```json
{
  "orientation": "landscape",
  "theme": "gruvbox"
}
```

**Response `200`** — full preferences object (same shape as GET).

> **Client mapping:** `saveGlobalOrientation` in `src/utils/pageOrientation.ts` stays as the local write; a sync wrapper calls this endpoint in the background.

---

## 3. Topics

Loaded **once at app startup** — all topics for the user. Topics contain no page data; pages are fetched per-topic on demand.

### `GET /topics`

Return every topic belonging to the authenticated user, ordered.

**Response `200`**

```json
[
  {
    "id": "top_a1b2c3",
    "name": "Welcome",
    "collapsed": false,
    "order": 0,
    "pageCount": 3,
    "createdAt": 1725312000000,
    "updatedAt": 1725312000000
  }
]
```

`pageCount` lets the sidebar show a count badge without loading pages.

---

### `POST /topics`

**Request**

```json
{
  "name": "Research"
}
```

**Response `201`**

```json
{
  "id": "top_x9y8z7",
  "name": "Research",
  "collapsed": false,
  "order": 1,
  "pageCount": 0,
  "createdAt": 1725400000000,
  "updatedAt": 1725400000000
}
```

---

### `PATCH /topics/:id`

Update name or collapsed state.

**Request** (all fields optional)

```json
{
  "name": "Deep Research",
  "collapsed": true
}
```

**Response `200`** — updated topic object.

---

### `DELETE /topics/:id`

**Query params:**

- `?orphanAction=untopic` — move pages to no-topic (default)
- `?orphanAction=delete` — delete all pages in the topic

**Response `204`** — no body.

---

### `PUT /topics/order`

Reorder all topics.

**Request**

```json
{
  "order": ["top_a1b2c3", "top_x9y8z7", "top_m3n4o5"]
}
```

**Response `200`**

```json
{ "updated": 3 }
```

---

## 4. Pages — Metadata (Stubs)

Page stubs are loaded **per-topic, on-demand, when the user expands a topic** in the sidebar. No content field is ever returned here.

### `GET /topics/:id/pages`

Fetch page stubs for a single topic. Call this when the sidebar chevron is clicked to expand.

**Response `200`**

```json
[
  {
    "id": "pag_d4e5f6",
    "title": "Welcome note",
    "topicId": "top_a1b2c3",
    "locked": false,
    "order": 0,
    "createdAt": 1725312000000,
    "updatedAt": 1725400000000
  }
]
```

No `content`, no `orientation` — kept intentionally small.

---

### `POST /pages`

Create a new page (stub only; content starts empty).

**Request**

```json
{
  "title": "Untitled",
  "topicId": "top_a1b2c3",
  "afterPageId": "pag_d4e5f6"
}
```

`afterPageId` is optional — insert after that page; omit to append.

**Response `201`**

```json
{
  "id": "pag_g7h8i9",
  "title": "Untitled",
  "topicId": "top_a1b2c3",
  "locked": false,
  "order": 1,
  "createdAt": 1725400000000,
  "updatedAt": 1725400000000
}
```

---

### `PATCH /pages/:id/meta`

Update page metadata — title, parent topic, locked state, order. Does **not** touch content. Used by sidebar rename, drag-and-drop reorder, and lock toggle.

**Request** (all fields optional)

```json
{
  "title": "Chapter 1",
  "topicId": "top_x9y8z7",
  "locked": true
}
```

**Response `200`** — updated page stub (no content).

---

### `PUT /topics/:id/pages/order`

Reorder pages within a topic (drag-and-drop in sidebar).

**Request**

```json
{
  "order": ["pag_d4e5f6", "pag_g7h8i9", "pag_j1k2l3"]
}
```

**Response `200`**

```json
{ "updated": 3 }
```

---

### `DELETE /pages/:id`

**Response `204`** — no body.

---

### `POST /pages/:id/duplicate`

Deep-copies title, content, and metadata into a new page immediately after the source.

**Response `201`** — new page stub (same shape as `POST /pages` response).

---

## 5. Pages — Content (On-Demand)

Content is loaded **only when the user selects a page** — never in bulk.

### `GET /pages/:id/content`

Fetch the full TipTap content for a single page. Call this when `onSelectPage` fires in `TopicSidebar`.

**Response `200`**

```json
{
  "id": "pag_d4e5f6",
  "content": "{\"type\":\"doc\",\"content\":[…]}",
  "updatedAt": 1725400000000
}
```

`content` is a JSON string (serialized TipTap document). Parse client-side before passing to the editor.

---

### `PATCH /pages/:id/content`

Auto-save the TipTap content. Called after a **2-second debounce** on editor change. This endpoint is intentionally separate from meta so large content payloads never travel with lightweight metadata syncs.

**Request**

```json
{
  "content": "{\"type\":\"doc\",\"content\":[…]}",
  "updatedAt": 1725400000000
}
```

`updatedAt` is the client's local timestamp — used for conflict detection.

**Response `200`**

```json
{
  "id": "pag_d4e5f6",
  "updatedAt": 1725400050000
}
```

**Response `409 CONFLICT`** — server copy is newer than the client's `updatedAt`:

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Server version is newer. Fetch the current content before saving.",
    "serverUpdatedAt": 1725400100000
  }
}
```

---

## 6. Incremental Sync

Used to reconcile local state with the server after coming online or switching devices. Syncs **metadata only** — content is never bulk-synced.

### `GET /sync/state?since=<timestamp>`

Pull all topic and page-stub changes that happened on the server after `since` (Unix ms). Pass `since=0` on first load.

**Response `200`**

```json
{
  "serverTime": 1725400500000,
  "topics": [
    {
      "id": "top_a1b2c3",
      "name": "Welcome",
      "collapsed": false,
      "order": 0,
      "pageCount": 3,
      "updatedAt": 1725400000000
    }
  ],
  "pages": [
    {
      "id": "pag_d4e5f6",
      "title": "Welcome note",
      "topicId": "top_a1b2c3",
      "locked": false,
      "order": 0,
      "updatedAt": 1725400000000
    }
  ],
  "deletedTopicIds": ["top_old1"],
  "deletedPageIds": ["pag_old1"]
}
```

Store `serverTime` as the new `lastSyncTime` cursor. Content of active page is separately re-fetched via `GET /pages/:id/content` only if `updatedAt` differs.

---

### `POST /sync/push`

Push all locally pending changes (metadata + any content changes) in one round-trip.

**Request**

```json
{
  "topics": [
    {
      "id": "top_a1b2c3",
      "name": "Research",
      "collapsed": true,
      "updatedAt": 1725400000000
    }
  ],
  "pages": [
    {
      "id": "pag_d4e5f6",
      "title": "Chapter 1",
      "topicId": "top_a1b2c3",
      "locked": false,
      "updatedAt": 1725400000000,
      "content": "{\"type\":\"doc\",\"content\":[…]}"
    }
  ],
  "deletedTopicIds": [],
  "deletedPageIds": ["pag_old1"]
}
```

`content` is optional — include it only for pages whose content has changed locally.

**Response `200`**

```json
{
  "accepted": {
    "topicIds": ["top_a1b2c3"],
    "pageIds": ["pag_d4e5f6"]
  },
  "conflicts": [
    {
      "pageId": "pag_conflict",
      "serverUpdatedAt": 1725400100000
    }
  ]
}
```

Conflict strategy: **last-write-wins on `updatedAt`**. Conflicted pages are returned for the client to re-fetch and show a diff banner if needed.

---

### `GET /sync/events` (Server-Sent Events)

Long-lived SSE stream for real-time cross-device push. Open this on login; reconnect with `Last-Event-ID` on drop.

```
event: topic_updated
id: 1725400001000
data: {"id":"top_a1b2c3","name":"Research","updatedAt":1725400001000}

event: page_meta_updated
id: 1725400002000
data: {"id":"pag_d4e5f6","title":"Chapter 1","topicId":"top_a1b2c3","updatedAt":1725400002000}

event: page_content_updated
id: 1725400003000
data: {"id":"pag_d4e5f6","updatedAt":1725400003000}

event: topic_deleted
id: 1725400004000
data: {"id":"top_old1"}

event: page_deleted
id: 1725400005000
data: {"id":"pag_old1"}

event: preferences_updated
id: 1725400006000
data: {"orientation":"landscape","theme":"gruvbox"}
```

`page_content_updated` carries only the id and timestamp — the client fetches actual content via `GET /pages/:id/content` only if that page is currently open.

---

## 7. Asset Upload (Images)

The `imageBlock` extension already has `uploadStatus` and `uploadId` attributes waiting for this.

### `POST /assets/upload`

Upload an image file. Client calls this immediately after the user picks a file in `ImageBlockView`, before saving page content — so the page is saved with a CDN URL, not a base64 blob.

**Request** `Content-Type: multipart/form-data`

```
file=<binary image>
pageId=pag_d4e5f6    (optional — for ownership/cleanup tracking)
```

**Response `200`**

```json
{
  "assetId": "ast_p9q0r1",
  "url": "https://cdn.pixelsetu.app/assets/ast_p9q0r1.webp",
  "width": 1280,
  "height": 720,
  "sizeBytes": 284000,
  "mimeType": "image/webp"
}
```

After receiving the response:

1. Set `src = url` on the `imageBlock` node attribute.
2. Set `uploadStatus = "uploaded"` and `uploadId = assetId`.
3. The 2-second auto-save debounce then persists content with the CDN URL (no base64 in the DB).

**Limits:** max 20 MB per file. Accepted: `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `image/svg+xml`.

---

### `GET /assets`

List the user's uploaded assets. Useful for a future asset manager panel.

**Query params:** `?pageId=pag_…` — filter by page; `?cursor=ast_…&limit=20` — pagination.

**Response `200`**

```json
{
  "items": [
    {
      "assetId": "ast_p9q0r1",
      "url": "https://cdn.pixelsetu.app/assets/ast_p9q0r1.webp",
      "width": 1280,
      "height": 720,
      "sizeBytes": 284000,
      "pageId": "pag_d4e5f6",
      "createdAt": 1725312000000
    }
  ],
  "nextCursor": "ast_abc"
}
```

---

### `DELETE /assets/:id`

Delete an asset from storage. Returns `204`.

---

## 8. Page Sharing

### `POST /pages/:id/share`

Generate a public share token for a page.

**Request**

```json
{
  "mode": "read",
  "expiresAt": null
}
```

`mode`: `"read"` (only option for now — comment/edit modes are future).  
`expiresAt`: Unix ms timestamp or `null` for no expiry.

**Response `201`**

```json
{
  "shareToken": "shr_xK9mN2Lp",
  "shareUrl": "https://app.pixelsetu.app/share/shr_xK9mN2Lp",
  "mode": "read",
  "expiresAt": null,
  "createdAt": 1725400000000
}
```

---

### `GET /share/:token` — **public, no auth required**

Serve a shared page to anyone with the link.

**Response `200`**

```json
{
  "title": "My Research Notes",
  "content": "{\"type\":\"doc\",\"content\":[…]}",
  "ownerName": "Ritwik Das",
  "sharedAt": 1725400000000
}
```

No `orientation` returned — the viewer's own orientation preference applies.

**Response `404`** — token not found.  
**Response `410 Gone`** — token has expired.

---

### `PATCH /pages/:id/share`

Update share settings (change expiry or mode).

**Request**

```json
{
  "expiresAt": 1757020800000
}
```

**Response `200`** — updated share object (same shape as POST response).

---

### `DELETE /pages/:id/share`

Revoke the share link. Returns `204`.

---

## 9. Word Memory Sync

Syncs the `wordMemory` IndexedDB bigrams and typing profile across devices so autocomplete feels consistent everywhere.

### `POST /word-memory/sync`

**Request**

```json
{
  "bigrams": [
    {
      "context": "the",
      "successors": { "quick": { "weight": 5, "casing": "quick" } },
      "updatedAt": 1725400000000
    }
  ],
  "profile": [
    {
      "word": "javascript",
      "casing": "JavaScript",
      "count": 42,
      "capitalized": 38,
      "accepted": 30,
      "rejected": 2,
      "lastUsedAt": 1725400000000
    }
  ]
}
```

**Response `200`** — merged server-side data sent back for the client to import:

```json
{
  "bigrams": [/* merged BigramRecord[] */],
  "profile": [/* merged WordProfileRecord[] */]
}
```

Merge strategy: max weight wins per edge; counts are summed.

---

### `DELETE /word-memory`

Clear the user's server-side word memory. Returns `204`.

---

## 10. AI Key Management

### `POST /ai/key`

Store an encrypted Gemini key. The client encrypts it with AES-GCM before sending — the server never sees plaintext.

**Request**

```json
{
  "encryptedKey": "<base64-encoded AES-GCM ciphertext>"
}
```

**Response `200`**

```json
{ "stored": true }
```

---

### `GET /ai/key/status`

**Response `200`**

```json
{ "hasKey": true }
```

---

### `DELETE /ai/key`

Remove the stored key. Returns `204`.

---

### `POST /ai/proxy`

Proxy a Gemini API call using a server-held key (rate-limited, for users without a personal key).

**Request**

```json
{
  "model": "gemini-2.0-flash-lite",
  "contents": [
    { "role": "user", "parts": [{ "text": "Summarise this paragraph…" }] }
  ]
}
```

**Response `200`** — raw Gemini response passthrough.

---

## Error Envelope

All error responses share one shape:

```json
{
  "error": {
    "code": "PAGE_NOT_FOUND",
    "message": "Page pag_abc does not exist.",
    "status": 404
  }
}
```

| HTTP | Code              | Meaning                              |
| ---- | ----------------- | ------------------------------------ |
| 400  | `BAD_REQUEST`     | Missing / invalid fields             |
| 401  | `UNAUTHORIZED`    | Missing or expired access token      |
| 403  | `FORBIDDEN`       | Authenticated but no permission      |
| 404  | `NOT_FOUND`       | Resource does not exist              |
| 409  | `CONFLICT`        | `updatedAt` mismatch on content save |
| 410  | `GONE`            | Share link expired                   |
| 413  | `ASSET_TOO_LARGE` | File exceeds 20 MB                   |
| 429  | `RATE_LIMITED`    | Too many requests (see limits below) |

---

## Rate Limits

| Endpoint group                            | Limit                |
| ----------------------------------------- | -------------------- |
| Auth (`/auth/*`)                          | 10 req / min / IP    |
| Sync push                                 | 30 req / min / user  |
| Content save (`PATCH /pages/:id/content`) | 60 req / min / user  |
| Asset upload                              | 20 req / min / user  |
| AI proxy                                  | 20 req / min / user  |
| All read endpoints                        | 120 req / min / user |

---

## Full Endpoint Index

| Method   | Path                      | Auth   | Description                        |
| -------- | ------------------------- | ------ | ---------------------------------- |
| `POST`   | `/auth/google`            | —      | Exchange Google code for tokens    |
| `POST`   | `/auth/refresh`           | Cookie | Refresh access token               |
| `DELETE` | `/auth/session`           | Cookie | Logout                             |
| `GET`    | `/users/me`               | ✓      | Get profile                        |
| `PATCH`  | `/users/me`               | ✓      | Update profile                     |
| `GET`    | `/users/me/preferences`   | ✓      | Get orientation + theme            |
| `PATCH`  | `/users/me/preferences`   | ✓      | Save orientation + theme           |
| `GET`    | `/topics`                 | ✓      | All topics (startup load)          |
| `POST`   | `/topics`                 | ✓      | Create topic                       |
| `PATCH`  | `/topics/:id`             | ✓      | Rename / collapse                  |
| `DELETE` | `/topics/:id`             | ✓      | Delete topic                       |
| `PUT`    | `/topics/order`           | ✓      | Reorder topics                     |
| `GET`    | `/topics/:id/pages`       | ✓      | Page stubs — load on topic expand  |
| `POST`   | `/pages`                  | ✓      | Create page                        |
| `PATCH`  | `/pages/:id/meta`         | ✓      | Update title, topicId, locked      |
| `DELETE` | `/pages/:id`              | ✓      | Delete page                        |
| `POST`   | `/pages/:id/duplicate`    | ✓      | Duplicate page                     |
| `PUT`    | `/topics/:id/pages/order` | ✓      | Reorder pages within topic         |
| `GET`    | `/pages/:id/content`      | ✓      | Full content — load on page select |
| `PATCH`  | `/pages/:id/content`      | ✓      | Auto-save content                  |
| `GET`    | `/sync/state`             | ✓      | Incremental pull since timestamp   |
| `POST`   | `/sync/push`              | ✓      | Push local changes                 |
| `GET`    | `/sync/events`            | ✓      | SSE stream for real-time push      |
| `POST`   | `/assets/upload`          | ✓      | Upload image, get CDN URL          |
| `GET`    | `/assets`                 | ✓      | List uploaded assets               |
| `DELETE` | `/assets/:id`             | ✓      | Delete asset                       |
| `POST`   | `/pages/:id/share`        | ✓      | Create share link                  |
| `GET`    | `/share/:token`           | —      | View shared page (public)          |
| `PATCH`  | `/pages/:id/share`        | ✓      | Update share settings              |
| `DELETE` | `/pages/:id/share`        | ✓      | Revoke share link                  |
| `POST`   | `/word-memory/sync`       | ✓      | Merge bigrams + profile            |
| `DELETE` | `/word-memory`            | ✓      | Clear word memory                  |
| `POST`   | `/ai/key`                 | ✓      | Store encrypted Gemini key         |
| `GET`    | `/ai/key/status`          | ✓      | Check if key is stored             |
| `DELETE` | `/ai/key`                 | ✓      | Remove key                         |
| `POST`   | `/ai/proxy`               | ✓      | Proxy Gemini call                  |
