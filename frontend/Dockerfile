FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4200

CMD ["sh", "-c", "node scripts/set-version.js && npx ng serve --host 0.0.0.0 --disable-host-check --proxy-config proxy.conf.docker.json --poll=2000"]
