FROM node:16

WORKDIR /usr/src/app

# This is our secret sauce
RUN git clone https://github.com/vishnubob/wait-for-it.git

COPY ["package*.json","tsconfig.json",".eslintrc",".eslintignore", "./"]

RUN npm install

COPY migrations ./migrations
COPY src ./src

EXPOSE 4000

RUN npm run build

CMD [ "node", "dist/server.js" ]