# Google OAuth Setup Guide

This guide will walk you through setting up Google OAuth authentication for the Linkprosoft Backend application.

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Make sure billing is enabled for your project

## Step 2: Enable the Google+ API (or Google People API)

Note: For Google Sign-In, you need to enable the Google+ API (which is being deprecated but still works for sign-in) or use the Google People API. For simplicity, we'll use the Google+ API for this guide.

1. In the Google Cloud Console, navigate to **APIs & Services > Library**
2. Search for "Google+ API" and enable it
   - Alternatively, you can enable the "Google People API" which is the recommended replacement

## Step 3: Create OAuth 2.0 Client ID

1. In the Google Cloud Console, go to **APIs & Services > Credentials**
2. Click **"Create credentials"** and select **"OAuth client ID"**
3. If you haven't set up an OAuth consent screen, you'll be prompted to do so:
   - Choose **External** as the user type (if your app is for external users)
   - Fill in the required information (app name, user support email, developer contact email)
   - For scopes, you can add `https://www.googleapis.com/auth/userinfo.email` and `https://www.googleapis.com/auth/userinfo.profile` (these are the scopes we use: openid email profile)
   - Save and continue
4. Back to creating credentials, select **Web application** as the application type
5. Give it a name (e.g., "Linkprosoft Backend")
6. Under **Authorized redirect URIs**, add your callback URI:
   - For development: `http://localhost:5020/api/auth/google/callback`
   - For production: Replace with your actual domain (e.g., `https://yourdomain.com/api/auth/google/callback`)
7. Click **Create**

## Step 4: Copy the Credentials

After creating the OAuth client ID, you will see:
- **Client ID**
- **Client secret**

Copy these values.

## Step 5: Set Environment Variables

Create a `.env` file in the root of the project (or update your existing one) with the following variables:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=https://linprosoft-backend.onrender.com/api/auth/google/callback
```

Note: In production, change the `GOOGLE_REDIRECT_URI` to your actual domain.

## Step 6: Database Migration

Run the migration script to add the `google_id` column to the users table:

```bash
# Assuming you have a way to run SQL migrations
# For example, if you're using node-pg-migrate or similar:
npm run migrate

# Or manually execute the SQL file:
psql -d your_database -f src/migrations/009_add_google_id_to_users.sql
```

## Step 7: Verify the Setup

1. Start the application: `npm run dev`
2. Navigate to your frontend and click the "Login with Google" button
3. You should be redirected to Google's authentication page
4. After successful login, you should be redirected back to your application and logged in

## Important Notes

### Scopes
We are requesting the following scopes from Google:
- `openid`: For OpenID Connect ID token
- `email`: To get the user's email address
- `profile`: To get the user's basic profile information (name, picture)

These are specified in the `scope` parameter in the `startGoogleOAuth` function.

### Access Type
We use `access_type: offline` to request a refresh token from Google. This allows us to obtain new access tokens without user interaction when the current one expires.

### Prompt
We use `prompt: consent` to always show the consent screen, which ensures we get a refresh token. In a production environment, you might want to change this to `consent` only for the first time or use a different strategy.

### State Parameter
For CSRF protection, we generate a random state parameter and include it in the OAuth request. In a production application, you should store this state in the user's session or in a cache (like Redis) and validate it in the callback. Currently, we are passing it through but not validating it (marked as TODO). Implementing proper state validation is recommended for production.

### User Roles
When a new user signs up via Google, we assign them the default role of "employer". You may want to change this or allow the user to choose a role during onboarding.

## Troubleshooting

### 400 Error: redirect_uri_mismatch
Make sure the redirect URI you set in the Google Cloud Console exactly matches the one in your `GOOGLE_REDIRECT_URI` environment variable.

### 403 Error: Developer Project Not Active
Ensure that the Google+ API (or Google People API) is enabled for your project.

### 401 or 403 Errors from Google
Double-check your Client ID and Client Secret for any typos.

### Database Errors
Ensure that the migration has been run successfully and that the `google_id` column exists in the `users` table.

## References
- [Google Sign-In for Websites](https://developers.google.com/identity/gsi/web)
- [OpenID Connect](https://developers.google.com/identity/protocols/OpenIDConnect)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)