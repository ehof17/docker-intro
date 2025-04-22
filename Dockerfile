FROM ghcr.io/puppeteer/puppeteer:latest 

# for on my mac FROM canardconfit/puppeteer-docker:puppeteer-23.10.1-arm64

# Using root to install dependencies
USER root 
# Install dependencies
COPY package.json /app/

RUN cd /app/ && npm install

COPY . /app/

WORKDIR /app  
# GCP likes to use port 8080
EXPOSE 8080

# Bug found in one of pupeteers github issues
ENV XDG_CONFIG_HOME=/tmp/.chromium
ENV XDG_CACHE_HOME=/tmp/.chromium

# Install Puppeteer browsers
RUN npx puppeteer browsers install

CMD ["npm", "start"]