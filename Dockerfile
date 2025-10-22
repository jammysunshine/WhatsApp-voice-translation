# Railway Configuration
# This is a Dockerfile-like configuration for Railway deployment

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Expose the port
EXPOSE $PORT

CMD ["npm", "start"]