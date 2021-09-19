
FROM node:15.12.0-slim

LABEL "com.github.actions.name"="Automated version bump for npm packages."
LABEL "com.github.actions.description"="Automated version bump for npm packages."
LABEL "com.github.actions.icon"="chevron-up"
LABEL "com.github.actions.color"="blue"

COPY package*.json ./

RUN apt-get update
RUN apt-get -y install git

RUN npm ci --only=production

COPY . .

ENTRYPOINT ["node", "/index.js"]
