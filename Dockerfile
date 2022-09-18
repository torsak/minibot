FROM node:18-alpine

RUN apk --no-cache add bash git
RUN apk --no-cache add --virtual build-dependencies build-base

WORKDIR /usr/src/app

COPY . .
RUN npm install

RUN addgroup -S nodejs
RUN adduser -S express -G nodejs
RUN chown express:nodejs /usr/src/app

VOLUME ["./database"]

CMD ["npm", "start"]
