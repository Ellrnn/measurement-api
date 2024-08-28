#BUILD STAGE
FROM node:20-alpine3.19 as build

WORKDIR /app

COPY package*.json .

COPY tsconfig.json .

RUN npm i

COPY . .

RUN npm run build


#PRODUCTION STAGE
# FROM node:20-alpine3.19 as production

# WORKDIR /app

# COPY package*.json .

# COPY tsconfig.json .

# RUN npm ci --only=production

# COPY --from=build /app/dist ./dist

# CMD ["node", "./dist/src/index.js"]

