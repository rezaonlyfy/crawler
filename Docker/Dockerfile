FROM node:18-alpine AS base
ARG NODE_ENV
ENV NODE_ENV ${NODE_ENV}
ENV HOME /app
WORKDIR ${HOME}
COPY package.json package-lock.json ${HOME}/

FROM base AS dependencies
COPY tsconfig.json tsconfig.build.json nest-cli.json ${HOME}/
COPY src/ ${HOME}/src
RUN npm ci

FROM dependencies AS development
COPY .eslintrc.js jest.config.js .prettierrc ${HOME}/

FROM dependencies AS builder
RUN npm run build
RUN npm ci --omit=dev

FROM base AS production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY evaluation ./evaluation
CMD ["node", "dist/main"]
