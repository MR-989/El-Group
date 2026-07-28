# EL Group Interior Design

## Cloud demo storage

The app can sync demo data through a Vercel API route backed by Supabase.

1. Create a Supabase project.
2. Run `supabase/elgroup_demo_state.sql` in the Supabase SQL editor.
3. Add these environment variables in Vercel:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_TABLE` = `elgroup_demo_state`
   - `SUPABASE_ROW_ID` = `default`
4. Redeploy the Vercel project.

Without those variables, the app falls back to browser `localStorage`.

Deployments and code updates do not clear saved demo data. Demo data should only be removed intentionally from the admin-only **Reset Demo Data** action.

This is still a demo storage model. For production, replace the demo login and plaintext passwords with real authentication and row-level access controls.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
