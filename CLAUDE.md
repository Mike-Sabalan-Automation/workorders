# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Work Order Management System with a clean modular architecture:

- **Frontend**: Pure HTML/CSS/JavaScript (no build system required)
- **Backend**: Supabase for authentication and data persistence with localStorage fallback
- **Architecture**: Modular design with separation of concerns

## File Structure

### Main Application
- `index.html` - Main HTML file (entry point)
- `css/styles.css` - All application styles
- `js/config.js` - Configuration and global state
- `js/auth.js` - Authentication management
- `js/storage.js` - Data storage (localStorage + Supabase)
- `js/workorders.js` - Work order CRUD operations
- `js/ui.js` - UI management and interactions
- `js/utils.js` - Utility functions and import/export
- `js/app.js` - Application initialization

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
- `id` (serial, primary key)
- `created_by` (uuid, foreign key to auth.users - who created it)
- `assigned_to` (uuid, foreign key to auth.users - who it's assigned to)
- `title` (text)
- `description` (text)
- `priority` (text: 'low', 'medium', 'high')
- `status` (text: 'open', 'in-progress', 'completed', 'on-hold')
- `due_date` (date)
- `estimated_hours` (numeric)
- `created_date` (timestamp)
- `updated_date` (timestamp)

### User Management
User properties are stored in `auth.users.raw_user_meta_data`:
- `organization_id` (string) - Which organization the user belongs to
- `is_admin` (boolean) - Whether user has admin privileges

### Role-Based Access Control
- **Admins**: Can create, view, and manage all work orders in their organization
- **Technicians**: Can only view and edit work orders assigned to them
- **RLS Policies**: Database-level security enforces these permissions

## Development Commands

This is a static HTML application with no build process:

- **Run locally**: Open `index.html` in a web browser
- **Deploy**: Upload all files maintaining directory structure
- **Dependencies**: All external libraries loaded via CDN

## Module Architecture

### Global Objects
- `window.appConfig` - Configuration and Supabase client
- `window.appState` - Application state (user, workOrders, etc.)
- `window.authManager` - Authentication methods
- `window.storageManager` - Data persistence methods
- `window.workOrderManager` - Work order CRUD operations
- `window.uiManager` - UI management and interactions
- `window.utils` - Utility functions

## Testing the Application

### For Development
1. Open `work_orders_modular.html` in a web browser (modular version)
2. Or open `index.html` (single file version)
3. Try both authenticated and unauthenticated modes
4. Test CRUD operations on work orders
5. Verify data persistence between browser sessions
6. Test responsive design on mobile devices

### Making Changes
- **CSS**: Edit `css/styles.css` for styling changes
- **Authentication**: Edit `js/auth.js` for auth-related features
- **Data Operations**: Edit `js/storage.js` for database operations
- **UI Features**: Edit `js/ui.js` for interface improvements
- **Work Order Logic**: Edit `js/workorders.js` for business logic
- **Utilities**: Edit `js/utils.js` for helper functions
- **Configuration**: Edit `js/config.js` for settings and global state