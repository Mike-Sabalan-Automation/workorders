# 🔧 Fix Supabase Email Redirect Issue

## The Problem
Supabase confirmation emails redirect to `https://mike-sabalan-automation.github.io/` (root) but your work order system is at `/workorders/`, causing a 404 or showing the wrong app.

## The Solution
Replace your main GitHub Pages index.html with an auto-redirect page.

## 📝 Steps to Fix:

### 1. Update Your Main Repository
Go to your main GitHub Pages repository (the one with the map analysis tool) and:

1. **Replace the current `index.html`** with the content from `main-index.html` (attached)
2. **Commit and push** the changes

### 2. Update Supabase Settings
In Supabase Dashboard → Authentication → URL Configuration:
- **Site URL:** `https://mike-sabalan-automation.github.io`
- **Redirect URLs:** `https://mike-sabalan-automation.github.io/**`

### 3. Test
- Sign up with a new email
- The confirmation email will redirect to the root
- The new index.html will automatically detect auth parameters and redirect to `/workorders/`

## 🎯 What This Does:
- **Normal visitors** → Redirects to work order system after 2 seconds
- **Auth confirmations** → Immediately redirects with auth tokens preserved
- **Nice loading page** → Shows professional loading screen during redirect
- **Fallback link** → Manual link if auto-redirect fails

## ✅ Result:
- Email confirmations will work automatically
- Your work order system becomes the main focus
- Professional landing page for all visitors
- No more manual URL editing needed

## 📁 Files to Use:
- Use `main-index.html` as your new `index.html` in the main repository