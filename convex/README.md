# Convex development

Ganttaro uses the Convex project in Taro's projects (Vercel).
Run `npm run convex:dev` from the repository root. The CLI keeps the deployment
selection in the ignored root `.env.local`. The Next.js client reads
`NEXT_PUBLIC_CONVEX_URL` from `apps/web/.env.local`.

Production and Preview deploy keys are managed by the Vercel Marketplace
connection. Keep credentials out of git.
