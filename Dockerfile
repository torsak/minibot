FROM node:18-alpine

RUN apk --no-cache add bash git
RUN apk --no-cache add --virtual build-dependencies build-base

# This additional packages required by node-canvas.
# https://github.com/Automattic/node-canvas/issues/1487#issuecomment-550063578
RUN apk --no-cache add python3 make gcc g++ pkgconfig pixman-dev cairo-dev pango-dev libjpeg-turbo-dev giflib-dev

# Download Alpine fonts to be used for Canvas export: https://wiki.alpinelinux.org/wiki/Fonts
RUN apk add --no-cache --update --repository http://dl-3.alpinelinux.org/alpine/edge/testing ttf-opensans fontconfig

WORKDIR /usr/src/app

COPY . .
RUN npm install

RUN addgroup -S nodejs
RUN adduser -S express -G nodejs
RUN chown express:nodejs /usr/src/app

VOLUME ["./database"]

CMD ["npm", "start"]
