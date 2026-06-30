# Cookie Crew — deploying with AI cookie photos (Vercel)

This folder is a ready-to-deploy Vercel project. The quiz already calls a
server-side proxy (`/api/cookie-image`) so your **OpenAI key is never exposed
in the browser**. You just deploy these files and add the key as an
environment variable.

```
deploy/
├── index.html              ← the site (proxy already wired in)
└── api/
    └── cookie-image.js      ← serverless function that holds your key
```

## What happens
When someone finishes the personality quiz, the site sends a text *prompt*
(not your key) to `/api/cookie-image`. That function adds your OpenAI key
server-side, calls `gpt-image-1`, and returns the image. The result card swaps
its hand-drawn cookie face for the real generated photo. If anything fails
(no key yet, rate limit, network), the hand-drawn face simply stays — nothing
breaks.

## Works on the free Hobby plan ✅
You do **not** need a paid Vercel plan. The free Hobby tier includes serverless
functions, and this project uses exactly one. The relevant free limits:

- **1,000,000 function calls/month** — each finished quiz = 1 call.
- **4 hours Active-CPU/month** — time spent *waiting* on OpenAI doesn't count
  against this, so an image proxy barely touches it.
- **60-second function timeout** (hard cap, no workaround on Hobby) — image
  generation takes ~10–20s, so you're well under it. The function is set to
  abort at 55s and return a clean error if OpenAI is ever unusually slow.
- **100 GB bandwidth/month** — plenty for a personal site.

One rule to know: Hobby is for **personal, non-commercial** use. This site's
"Order now" button is just a friendly message, so it qualifies. If you ever
start actually selling cookies through it, Vercel's terms would require Pro.

---

## One-time setup

### 1. Get an OpenAI key
- Go to platform.openai.com → API keys → create a new secret key (`sk-...`).
- Make sure the account has billing/credits, and that your org is verified for
  `gpt-image-1` (Settings → Limits; image generation may require ID
  verification on new accounts).

### 2. Deploy to Vercel
Easiest (no terminal):
1. Put this `deploy/` folder in a GitHub repo (the two files at the root:
   `index.html` and `api/cookie-image.js`).
2. On vercel.com → **Add New → Project** → import that repo.
3. Framework preset: **Other**. Leave build settings empty (it's static + a
   serverless function). Click **Deploy**.

Or with the CLI:
```bash
npm i -g vercel
cd deploy
vercel            # follow prompts, accept defaults
vercel --prod     # deploy to production
```

### 3. Add your key as an environment variable
In Vercel → your project → **Settings → Environment Variables**, add:

| Name             | Value                          |
|------------------|--------------------------------|
| `OPENAI_API_KEY` | `sk-...your key...`            |

(Optional, to lock the API to your own domain:)

| Name             | Value                                  |
|------------------|----------------------------------------|
| `ALLOWED_ORIGIN` | `https://your-project.vercel.app`      |

After adding variables, **redeploy** (Vercel → Deployments → ⋯ → Redeploy) so
the function picks them up.

### 4. Test
Open your live URL, take the quiz, finish it. Within ~10–20 seconds the result
portrait should turn into a real generated cookie photo.

## Costs & safety notes
- Each finished quiz generates **one** image. `gpt-image-1` is billed per
  image (check current pricing on OpenAI's site). If the page gets a lot of
  traffic, that adds up — set a monthly spend limit in your OpenAI billing
  settings to be safe.
- The key lives only in Vercel's environment, never in `index.html`. Never
  paste your key into the HTML file (the old `IMAGE_API.apiKey` field) on a
  public site — anyone could read it.
- `ALLOWED_ORIGIN` is a light guard so other sites can't call your function
  from a browser. It's not bulletproof (server-to-server callers can spoof
  origins), so the spend limit above is your real backstop.

## Local testing (optional)
`vercel dev` runs the function locally. Create a `.env.local` in `deploy/`:
```
OPENAI_API_KEY=sk-...
```
then `vercel dev` and open the printed localhost URL.

## If you ever move off Vercel
The front-end just needs `IMAGE_API.proxyUrl` (in `index.html`) to point at any
endpoint that accepts `POST {prompt, size}` and returns OpenAI's
`{ data: [{ b64_json }] }` shape. The Netlify/Cloudflare equivalents are nearly
identical to `api/cookie-image.js`.
