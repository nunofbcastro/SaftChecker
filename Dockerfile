FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openjdk-17-jre-headless ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src
COPY public ./public

RUN mkdir -p /app/data/uploads /app/data/logs /app/data/checker

EXPOSE 3000

CMD ["npm", "start"]
