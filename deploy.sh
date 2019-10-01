cd ~/apps/lot-commander
pm2 delete lot-commander
rm -rf node_modules dist
npm ci
#npm install
npm run build-client
pm2 start process.json