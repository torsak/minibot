FROM node:18-alpine

RUN apk --no-cache add bash
RUN apk --no-cache add --virtual build-dependencies build-base

WORKDIR /usr/src/app

COPY ["./package.json", "./package.json"]
RUN npm install
COPY . .

RUN addgroup -S nodejs
RUN adduser -S express -G nodejs
RUN chown express:nodejs /usr/src/app

CMD ["npm", "start"]
