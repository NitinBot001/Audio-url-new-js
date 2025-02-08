# Use the official Python image as a base
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt requirements.txt

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright and required browser dependencies
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    apt-get install -y libnss3 libatk-bridge2.0-0 libxcomposite1 libxrandr2 libgbm1 libasound2 libpangocairo-1.0-0 && \
    python -m playwright install --with-deps chromium

# Copy the application files into the container
COPY . .

# Expose the application port
EXPOSE 3000

# Define the command to run the application
CMD ["python", "app.py"]
