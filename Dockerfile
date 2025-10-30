FROM ghcr.io/puppeteer/puppeteer:latest 

# for on my mac
#FROM canardconfit/puppeteer-docker:puppeteer-23.10.1-arm64

# Using root to install dependencies
USER root 
# Install dependencies
COPY package.json /app/

WORKDIR /app 

RUN npm install

COPY . /app/

 
# GCP likes to use port 8080
EXPOSE 8080

# Bug found in one of pupeteers github issues
ENV XDG_CONFIG_HOME=/tmp/.chromium
ENV XDG_CACHE_HOME=/tmp/.chromium


# install cron
RUN apt-get update \
 && apt-get install -y --no-install-recommends cron bash jq \
 && rm -rf /var/lib/apt/lists/*

# Install Puppeteer browsers
RUN npx puppeteer browsers install chrome

RUN echo "0 1 * * * /app/run_cron.sh >> /var/log/cron.log 2>&1" > /etc/cron.d/app-cron && \
    chmod 0644 /etc/cron.d/app-cron && \
    crontab /etc/cron.d/app-cron
    

CMD ["cron", "-f"]