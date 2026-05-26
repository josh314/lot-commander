FROM node:24 AS deps

WORKDIR /app

COPY package.json package-lock.json ./

# Local:  docker build --secret id=npmrc,src=.npmrc .
# CI/CD:  .npmrc is written from CI_JOB_TOKEN in before_script and passed the same way.
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci

COPY . .

RUN npm run build-client


FROM node:24 AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/package.json ./
COPY --from=deps /app/package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/assets ./assets
COPY --from=deps /app/server ./server
COPY --from=deps /app/dist ./dist

EXPOSE 8080
CMD [ "node", "server/index.js" ]