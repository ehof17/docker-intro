## LeConnections Webscraper

This project uses **Docker** and **Google Cloud Build** to deploy a Node.js + Puppeteer scraper to **Cloud Run**.
> This is my first project using Docker, created to explore containerization and deployment with Google Cloud.
---
### Overview
- [LeConnections](https://www.leconnections.app) is a daily NBA puzzle where you select 4 players from a grid of 16 to uncover the hidden connection between them.
- This scraper vists the site, and intentionally fails to return the full solution for the day.
- I plan to use this as part of a future project that explores player relationships and basketball data.

### Quick Steps to Deploy

1. **Create a Docker repository** in your Google Cloud project (e.g., `nba-scraper`)

2. **Set your active project** with the Google Cloud CLI:
   gcloud config set project YOUR_PROJECT_ID

3. **Create a `cloudbuild.yaml`** file to define the build process:
- Name your image and give it a tag 
- google cloud will autofill the projectID
# cloudbuild.yaml
```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    script: |
      docker build -t us-west2-docker.pkg.dev/$PROJECT_ID/repository/image:tag .
    automapSubstitutions: true
images:
  - 'us-west2-docker.pkg.dev/$PROJECT_ID/repository/image:tag'
```

4. **Run the build** with:

gcloud builds submit --region=us-west2 --config cloudbuild.yaml

---

### ARM64 (Apple Silicon) Notes

- If you're building locally on an **ARM64 architecture** (Apple M), **Puppeteer may run slowly** due to emulation.
- You can speed up local builds using an ARM64-compatible base image such as:

  canardconfit/puppeteer-docker:puppeteer-23.10.1-arm64

- However, when deploying to **Google Cloud Run**, your image **must be built for `amd64`**, as it's the required architecture for Puppeteer to function properly on Cloud infrastructure.

To avoid issues:
- Always **build for `amd64`** when deploying:
  docker build --platform=linux/amd64 -t your-image-name .

- Or let **Cloud Build handle it** using the `cloudbuild.yaml` config above.