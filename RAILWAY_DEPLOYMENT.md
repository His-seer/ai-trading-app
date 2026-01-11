# Railway Deployment Guide

Deploy your AI Trading App to Railway in minutes.

## Prerequisites

- GitHub account with your code pushed
- [Railway account](https://railway.app/) (free tier available)
- Your API keys ready (Gemini, TwelveData)

---

## Step 1: Push to GitHub

```bash
git add .
git commit -m "Add Railway deployment config"
git push origin main
```

---

## Step 2: Deploy Backend

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Click **"Add variables"** and add:

| Variable | Value |
|----------|-------|
| `GEMINI_API_KEY` | Your Gemini API key |
| `TWELVEDATA_API_KEY` | Your TwelveData API key |
| `FINNHUB_API_KEY` | Your Finnhub API key |
| `NODE_ENV` | `production` |
| `PORT` | `3001` |

5. In **Settings** → **Networking**, generate a public domain
6. Copy the backend URL (e.g., `https://your-backend.railway.app`)

---

## Step 3: Deploy Frontend

1. In the same Railway project, click **"New"** → **"GitHub Repo"**
2. Select the same repo, but set **Root Directory** to `frontend`
3. Add variable:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | Your backend URL from Step 2 |

4. Generate a public domain for the frontend

---

## Step 4: Connect Backend to Frontend

1. Go back to your **backend** service
2. Add variable:

| Variable | Value |
|----------|-------|
| `FRONTEND_URL` | Your frontend URL from Step 3 |

3. Redeploy the backend

---

## Step 5: Add Persistent Volume (Keep SQLite Data)

1. In your **backend** service, go to **Volumes**
2. Click **"New Volume"**
3. Set mount path to `/app/data`
4. This ensures your database persists between deploys

---

## Verify Deployment

- Frontend: `https://your-frontend.railway.app`
- Backend health: `https://your-backend.railway.app/health`
- API docs: `https://your-backend.railway.app/`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | Verify `FRONTEND_URL` is set correctly in backend |
| API not connecting | Check `NEXT_PUBLIC_API_URL` includes `https://` |
| Data lost on redeploy | Add a persistent volume (Step 5) |
