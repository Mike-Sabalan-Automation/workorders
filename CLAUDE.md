# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Work Order Management System built as a single-page HTML application with vanilla JavaScript. The application features:

- **Frontend**: Pure HTML/CSS/JavaScript (no build system required)
- **Backend**: Supabase for authentication and data persistence with localStorage fallback
- **Architecture**: Single file application (`work_orders.html`) containing all functionality

## Key Architecture Details

### Data Storage Strategy
The application uses a hybrid storage approach:
1. **Primary**: Supabase database for authenticated users
2. **Fallback**: localStorage when Supabase is unavailable or user is unauthenticated
3. **Graceful degradation**: Automatically falls back to localStorage if Supabase operations fail

### Authentication Flow
- Uses Supabase Auth with email/password
- Supports both login and signup
- Auto-detects authentication state on page load
- Graceful handling of unauthenticated users (localStorage mode)

### Configuration Requirements
Before the application can connect to Supabase, update these variables in the JavaScript section:
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

### Database Schema
The application expects a `work_orders` table in Supabase with these fields:
- `id` (integer, primary key)
- `user_id` (uuid, foreign key to auth.users)
- `title` (text)
- `description` (text)
- `assignee` (text)
- `priority` (text: 'low', 'medium', 'high')
- `status` (text: 'open', 'in-progress', 'completed', 'on-hold')
- `due_date` (date)
- `estimated_hours` (numeric)
- `created_date` (timestamp)
- `updated_date` (timestamp)

## Development Commands

This is a static HTML application with no build process:

- **Run locally**: Open `work_orders.html` in a web browser
- **Deploy**: Upload `work_orders.html` to any web server
- **No dependencies**: All external libraries loaded via CDN

## Testing the Application

1. Open `work_orders.html` in a web browser
2. Try both authenticated and unauthenticated modes
3. Test CRUD operations on work orders
4. Verify data persistence between browser sessions
5. Test responsive design on mobile devices