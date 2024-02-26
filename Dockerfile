FROM node:16.14.2 AS base

RUN apt-get update && apt-get install -y wait-for-it

WORKDIR /app
COPY ["package.json", "package-lock.json*", "jest-int.json", "./"]

FROM base AS dev
ENV NODE_ENV=development
RUN npm ci
COPY . .
RUN npx prisma generate
CMD ["npm", "run", "start:dev"]

FROM dev AS test
ENV NODE_ENV=test
CMD ["npm", "run", "test:int"]

FROM test AS test-cov
CMD ["npm", "run", "test:int:cov"]

FROM dev AS test-watch
CMD ["npm", "run", "test:int:watch"]

FROM base AS prod
ENV NODE_ENV=production
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npm install -g @nestjs/cli
RUN npm run build
CMD ["npm", "run", "start:prod"]