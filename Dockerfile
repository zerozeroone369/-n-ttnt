FROM node:20-slim

# Install Python + pip + required system libs
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    libssl-dev \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=5000
ENV PYTHON_BIN=python3
ENV NODE_OPTIONS="--max-old-space-size=256"

EXPOSE 5000
CMD ["npm", "start"]
