# Deployment Guide

This guide will help you deploy Player Pro to Render.

## Prerequisites

- GitHub account with the repository
- Render account (sign up at https://render.com)

## Step 1: Database Setup

1. Go to Render Dashboard → New → PostgreSQL
2. Create a new PostgreSQL database:
   - Name: `player-pro-db`
   - Plan: Starter (or higher for production)
   - Region: Choose closest to your users
3. Note the **Internal Database URL** and **External Connection String**

## Step 2: Backend Deployment

1. Go to Render Dashboard → New → Web Service
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: `player-pro-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Starter (or higher)

4. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=<Internal Database URL from Step 1>
   JWT_SECRET=<Generate a strong random string>
   JWT_EXPIRES_IN=7d
   FRONTEND_URL=<Will be your frontend URL>
   TEACHER_SERIAL_PEPPER=VPR_Music_Center_2024_Secure_Pepper
   ```

5. Deploy the service

6. After deployment, run migrations:
   - Go to the service → Shell
   - Run: `npm run migrate`

## Step 3: Frontend Deployment

1. Go to Render Dashboard → New → Static Site
2. Connect your GitHub repository
3. Configure the site:
   - **Name**: `player-pro-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

4. Add Environment Variable:
   ```
   VITE_API_URL=<Your backend URL from Step 2>
   ```

5. Deploy the site

## Step 4: Update Backend CORS

1. Go back to your backend service
2. Update the `FRONTEND_URL` environment variable with your frontend URL
3. Redeploy if needed

## Step 5: Verify Deployment

1. Visit your frontend URL
2. Try registering a new user
3. Test login functionality
4. Verify database connection by checking if data persists

## Troubleshooting

### Database Connection Issues
- Ensure `DATABASE_URL` uses the **Internal Database URL** for Render services
- Check that the database is in the same region as your backend

### CORS Errors
- Verify `FRONTEND_URL` in backend matches your actual frontend URL
- Check that the frontend is making requests to the correct backend URL

### Migration Errors
- Ensure database is created before running migrations
- Check database connection string format
- Verify all required tables are created

### Build Errors
- Check Node.js version compatibility
- Verify all dependencies are in package.json
- Check build logs for specific errors

## Custom Domain (Optional)

1. In Render, go to your service/site
2. Click on Settings → Custom Domain
3. Add your domain
4. Follow DNS configuration instructions

## Monitoring

- Use Render's built-in logs for debugging
- Set up health check endpoints monitoring
- Monitor database usage and scale as needed

## Security Checklist

- [ ] Use strong JWT_SECRET (at least 32 characters)
- [ ] Enable HTTPS (automatic on Render)
- [ ] Set secure CORS origins
- [ ] Use environment variables for all secrets
- [ ] Regularly update dependencies
- [ ] Enable database backups
