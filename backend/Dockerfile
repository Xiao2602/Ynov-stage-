FROM node:20-alpine

WORKDIR /app

# Install dependencies first for efficient layer caching
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Expose backend REST API port
EXPOSE 5000

# Start backend server
CMD ["npm", "start"]
