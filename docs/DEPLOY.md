# Deploying QualSight AI to Google Cloud Run

This guide covers building and deploying QualSight AI to **Google Cloud Run** using **Cloud Build** and a **Docker** image.

## Prerequisites

1. **Google Cloud CLI** (`gcloud`) installed and logged in:
   ```bash
   gcloud auth login
   gcloud config set project qualisight-ai
   ```
   (Use your project ID, e.g. `qualisight-ai` — not the project number.)

2. **APIs enabled** in your project:
   - Cloud Build API
   - Artifact Registry API
   - Cloud Run API
   - Vertex AI API (for Gemini)

   ```bash
   gcloud services enable cloudbuild.googleapis.com run.googleapis.com artifactregistry.googleapis.com aiplatform.googleapis.com
   ```

3. **Artifact Registry repository** for Docker images (create if missing):
   ```bash
   gcloud artifacts repositories create qualisight \
     --repository-format=docker \
     --location=us-central1 \
     --description="QualSight AI images"
   ```
   Use the same `--location` as your `_REGION` in `cloudbuild.yaml`.

4. **Environment variables** for the app (Gemini/Vertex API keys or ADC) must be configured in Cloud Run after the first deploy (see **Environment & secrets** below).

---

## Quick deploy

From the project root:

```bash
./scripts/deploy.sh
```

Or with Cloud Build directly:

```bash
gcloud builds submit --config=cloudbuild.yaml .
```

Default substitutions in `cloudbuild.yaml`:

| Variable         | Default          |
|------------------|------------------|
| `_SERVICE_NAME`  | `qualisight-v1`  |
| `_REGION`        | `us-central1`    |
| `_REPOSITORY`    | `qualisight`     |
| `_IMAGE_NAME`    | `qualisight-ai`  |

To override (e.g. different region or service name):

```bash
gcloud builds submit --config=cloudbuild.yaml . \
  --substitutions="_SERVICE_NAME=qualisight-prod,_REGION=us-central1"
```

Or with the script:

```bash
SERVICE_NAME=qualisight-prod REGION=us-central1 ./scripts/deploy.sh
```

---

## What the build does

1. **Step 0 (Build)** – Builds a Docker image from the repo (see `Dockerfile`): installs deps, runs `npm run build`, and sets the app to listen on `PORT` (default 8080).
2. **Step 1–2 (Push)** – Pushes the image to Artifact Registry at  
   `{REGION}-docker.pkg.dev/{PROJECT_ID}/{_REPOSITORY}/{_IMAGE_NAME}:{BUILD_ID}` and `:latest`.
3. **Step 3 (Deploy)** – Deploys that image to Cloud Run as the service `_SERVICE_NAME` in `_REGION`, with `--allow-unauthenticated` so the app is publicly reachable.

---

## Environment & secrets

The app expects configuration (e.g. Gemini/Vertex) via environment variables or Application Default Credentials (ADC). After the first deploy:

1. Open [Cloud Run](https://console.cloud.google.com/run) → your service → **Edit & deploy new revision**.
2. Under **Variables & secrets**, add the same env vars you use locally (e.g. `GEMINI_API_KEY` or whatever your `server.js` / `geminiService` read).
3. For Vertex AI, ensure the Cloud Run service account has **Vertex AI User** (or equivalent) so ADC can call the API.

Redeploy or **Deploy** the new revision after changing env vars.

---

## Local Docker build (optional)

To build and run the same image locally:

```bash
docker build -t qualisight-ai .
docker run -p 8080:8080 --env-file .env qualisight-ai
```

Use `PORT=8080` and the same env vars as in production.

---

## Files involved

| File               | Purpose |
|--------------------|--------|
| `Dockerfile`       | Image: Node 18, install, build frontend, run `server.js`. |
| `.dockerignore`    | Keeps build context small (excludes `node_modules`, `.git`, etc.). |
| `cloudbuild.yaml`  | Cloud Build steps: build image, push to Artifact Registry, deploy to Cloud Run. |
| `.gcloudignore`    | Excludes unneeded files when using `gcloud builds submit`. |
| `scripts/deploy.sh`| Wrapper script to run `gcloud builds submit` with default substitutions. |

---

## Troubleshooting

### Build step 0 failed (Docker build)

- **Exit 125** – Usually an invalid image tag (e.g. empty `SHORT_SHA` when submitting a tarball). This project uses `BUILD_ID` instead; if you see 125, ensure you’re using the repo’s `cloudbuild.yaml`.
- **npm run build fails** – Check the build logs. Run a local build: `docker build -t qualisight-ai .` and fix any TypeScript/Vite errors. Ensure `package.json` has a valid `build` script and all source files are present (not excluded by `.gcloudignore`).

### Build step 1 failed (Docker push)

- **Exit 1** – Usually the Cloud Build service account can’t push to Artifact Registry. The deploy script now grants `roles/artifactregistry.writer` to the Cloud Build SA. If it still fails:
  1. Create the repo if missing:  
     `gcloud artifacts repositories create qualisight --repository-format=docker --location=us-central1 --project=qualisight-ai`
  2. Grant the Cloud Build SA permission:  
     `PROJECT_NUM=$(gcloud projects describe qualisight-ai --format='value(projectNumber)')`  
     `gcloud projects add-iam-policy-binding qualisight-ai --member="serviceAccount:${PROJECT_NUM}@cloudbuild.gserviceaccount.com" --role="roles/artifactregistry.writer"`
- **Repository not found** – Ensure the Artifact Registry repo exists in the same region as `_REGION` in `cloudbuild.yaml` (e.g. `us-central1`).

### Viewing build logs

To see the exact error for a failed build:

```bash
gcloud builds log BUILD_ID --project=qualisight-ai
```

Use the build ID from the “Created [https://...]” line (e.g. `68751f1f-837e-4f96-8f08-e45544c49006`), or open the “Logs are available at” URL in the console.

### Other

- **Permission denied** on `./scripts/deploy.sh`: run `chmod +x scripts/deploy.sh`.
- **Cloud Run 502 / startup errors**: Check Cloud Run logs; ensure `PORT` is 8080 and env vars (e.g. `GOOGLE_GENERATIVE_AI_API_KEY`) are set in the Cloud Run revision.
- **Vertex AI / Gemini errors**: Confirm Vertex AI API is enabled and the Cloud Run service account has the right IAM role.
