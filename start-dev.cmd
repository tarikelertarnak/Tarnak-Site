@echo off
rem Portfolio dev server launcher (Task Scheduler: TarikelerDevServer)
rem NODE_OPTIONS ipv4first: Windows default DNS order stalls Supabase (Cloudflare) connections
cd /d "C:\Users\TARIKELER\Documents\Projelerim\Tarnak\site"
set "NODE_OPTIONS=--dns-result-order=ipv4first"
npm run dev > dev-server.log 2>&1