# CafePilots

CafePilots is a modern, enterprise-grade cafe management and Point of Sale (POS) platform — tagline: **Run Every Café Smarter.**

It features strict Role-Based Access Control, live multi-franchise inventory tracking, automated Bill of Materials (BOM) stock deductions via a POS interface, and centralized supplier and user management.

## Tech Stack
*   **Frontend**: React (Vite)
*   **Styling**: Material-UI (MUI) / Emotion
*   **State Management**: Zustand
*   **Routing**: React Router DOM
*   **Database**: Supabase (PostgreSQL)

## Getting Started Locally

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the root directory (never commit this file) with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Database Setup**
   Check the `/scripts` directory for the SQL files needed to set up your Supabase database schema, row-level security policies, and seed data.

## Features
*   **Multi-Tenancy**: Centralized dashboard for Platform Super Admins, isolated views for Franchise Managers.
*   **POS Integration**: Log sales and automatically deduct exact raw material quantities based on custom Recipes (BOM).
*   **Supplier Master**: Centralized vendor directory.
*   **Responsive UI**: Modern glassmorphism aesthetic built for both desktop and tablets.
