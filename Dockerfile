FROM node:17-alpine
WORKDIR /app

COPY ./package.json .
COPY ./package-lock.json .
RUN npm install
COPY . .
EXPOSE 4040
CMD ["node", "server.js"]
