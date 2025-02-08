FROM node:18-slim

# Install system dependencies for Playwright
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk1.0-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libcairo2 \
    libharfbuzz0b \
    libgdk-pixbuf2.0-0 \
    libegl1

# Install Node.js dependencies
WORKDIR /app
COPY package.json ./
RUN npm install
RUN npx playwright install chromium

# Copy application files
COPY . .

CMD ["node", "server.js"]
