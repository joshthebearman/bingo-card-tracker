# Deployment Guide for Bingo Card Tracker

This guide covers deploying the application to Render.com with all security fixes implemented.

## Security Improvements Implemented

1. ✅ **API URL fix** - Changed to relative paths (works on any domain)
2. ✅ **Rate limiting** - Prevents spam and abuse
3. ✅ **Input validation** - All user input is validated and sanitized
4. ✅ **Authentication for delete** - Requires owner name verification
5. ✅ **PostgreSQL** - Replaced SQLite with persistent database
6. ✅ **CORS configuration** - Restricted to allowed origins in production
7. ✅ **Request size limits** - 100kb max payload size
8. ✅ **Error logging** - Winston logger for monitoring

## Prerequisites

- GitHub account with your code pushed
- Render.com account (free tier works)

## Step 1: Create PostgreSQL Database on Render

1. Go to https://dashboard.render.com/
2. Click **New +** → **PostgreSQL**
3. Configure:
   - **Name**: `bingo-card-db` (or your choice)
   - **Database**: `bingo_cards`
   - **User**: (auto-generated)
   - **Region**: Choose closest to your users
   - **Plan**: **Free** (or paid for better performance)
4. Click **Create Database**
5. **IMPORTANT**: Copy the **Internal Database URL** (starts with `postgresql://`)
   - You'll need this for the next step

## Step 2: Deploy Web Service on Render

1. In Render Dashboard, click **New +** → **Web Service**
2. Connect your GitHub repository: `joshthebearman/bingo-card-tracker`
3. Configure:
   - **Name**: `bingo-card-tracker` (or your choice)
   - **Region**: Same as database
   - **Branch**: `main`
   - **Runtime**: **Node**
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: **Free** (or paid for better uptime)

## Step 3: Configure Environment Variables

In the web service settings, add these environment variables:

| Key | Value | Description |
|-----|-------|-------------|
| `DATABASE_URL` | `postgresql://...` | The Internal Database URL from Step 1 |
| `NODE_ENV` | `production` | Enables production security features |
| `ALLOWED_ORIGINS` | `https://your-app.onrender.com` | Replace with your actual Render URL |

**Note**: After first deployment, update `ALLOWED_ORIGINS` with your actual URL.

## Step 4: Deploy

1. Click **Create Web Service**
2. Render will automatically:
   - Clone your repo
   - Install dependencies
   - Start the server
   - Create tables in PostgreSQL automatically
3. Wait for deployment to complete (~2-3 minutes)
4. Your app will be available at: `https://your-app-name.onrender.com`

## Step 5: Update ALLOWED_ORIGINS

1. After deployment, copy your actual Render URL
2. Go to **Environment** in your web service settings
3. Update `ALLOWED_ORIGINS` to your actual URL (e.g., `https://bingo-card-tracker.onrender.com`)
4. Click **Save Changes** (this will trigger a redeploy)

## Step 6: Test the Deployment

1. Visit your Render URL
2. Create a test card
3. Verify:
   - Card creation works
   - Card loads by code
   - Goal completion works
   - Settings can be saved
   - Delete requires owner name

## Future Updates

When you push changes to GitHub:
1. Go to your Render web service
2. Click **Manual Deploy** → **Deploy latest commit**
3. Or enable **Auto-Deploy** in settings

## Rate Limits (Protecting Your App)

The following limits are configured:
- **Card creation**: 5 cards per IP per 15 minutes
- **All API requests**: 100 requests per IP per minute

These limits prevent abuse while allowing normal usage.

## Migration from SQLite to PostgreSQL

If you have existing data in SQLite that you need to migrate:

1. Export data from SQLite:
```bash
sqlite3 bingo_cards.db .dump > backup.sql
```

2. Convert SQLite syntax to PostgreSQL (manual or use tools)
3. Import to PostgreSQL using Render's psql access

**Note**: Since this is a new deployment, no migration is needed.

## Monitoring & Logs

To view logs:
1. Go to your web service in Render Dashboard
2. Click **Logs** tab
3. All errors and info messages appear here (via Winston logger)

## Troubleshooting

### "Database connection error"
- Verify `DATABASE_URL` environment variable is set correctly
- Ensure PostgreSQL database is running

### "CORS policy violation"
- Check `ALLOWED_ORIGINS` matches your Render URL exactly
- Include `https://` prefix

### "Card not loading"
- Check browser console for errors
- Verify API requests are going to correct URL

### "Too many requests" error
- This is rate limiting working correctly
- Wait 15 minutes and try again
- Or contact users to reduce spam

## Cost Estimate

**Free Tier (0-50 users):**
- Web Service: Free (spins down after 15 min inactivity)
- PostgreSQL: Free (1GB storage, 97 hours uptime/month)
- **Total: $0/month**

**Paid Tier (100-200+ users):**
- Web Service: $7/month (always on, more resources)
- PostgreSQL: $7/month (10GB storage, always on)
- **Total: $14/month**

## Security Notes

- Owner name verification prevents unauthorized deletions
- Rate limiting prevents spam and DDoS
- Input validation prevents XSS and injection attacks
- CORS restricts API access to your domain only
- All user input is sanitized before storage
- Request size limits prevent memory attacks
- Error logging helps identify security issues

## Support

For issues, check:
1. Render logs (Dashboard → Logs)
2. Browser console (F12 → Console tab)
3. GitHub issues: https://github.com/joshthebearman/bingo-card-tracker/issues
