#!/usr/bin/env bash
# Deploy QualSight AI to Google Cloud Run via Cloud Build.
# Prerequisites: gcloud CLI, project set (gcloud config set project PROJECT_ID).
# Optional: set env vars PROJECT_ID, SERVICE_NAME, REGION, REPOSITORY, IMAGE_NAME to override defaults.
# If gcloud is set to a project *number*, the script resolves it to the project ID automatically.

set -e

SERVICE_NAME="${SERVICE_NAME:-qualisight-v1}"
REGION="${REGION:-us-central1}"
REPOSITORY="${REPOSITORY:-qualisight}"
IMAGE_NAME="${IMAGE_NAME:-qualisight-ai}"

# Resolve project: use PROJECT_ID if set, else use gcloud config and resolve number -> ID if needed
if [[ -n "${PROJECT_ID:-}" ]]; then
  GCLOUD_PROJECT="$PROJECT_ID"
else
  GCLOUD_PROJECT="$(gcloud config get-value project 2>/dev/null || true)"
  if [[ -z "$GCLOUD_PROJECT" ]]; then
    echo "ERROR: No project set. Run: gcloud config set project qualisight-ai"
    echo "Or set PROJECT_ID=qualisight-ai (use the project ID, not the project number)."
    exit 1
  fi
  if [[ "$GCLOUD_PROJECT" =~ ^[0-9]+$ ]]; then
    RESOLVED="$(gcloud projects describe "$GCLOUD_PROJECT" --format='value(projectId)' 2>/dev/null || true)"
    if [[ -n "$RESOLVED" ]]; then
      GCLOUD_PROJECT="$RESOLVED"
      echo "Using project ID: $GCLOUD_PROJECT (resolved from project number)."
    fi
  fi
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Deploying QualSight AI to Cloud Run..."
echo "  Project: $GCLOUD_PROJECT"
echo "  Service: $SERVICE_NAME"
echo "  Region:  $REGION"
echo "  Image:   $REGION-docker.pkg.dev/$GCLOUD_PROJECT/$REPOSITORY/$IMAGE_NAME"
echo ""

# Ensure Artifact Registry repo exists (push fails with exit 1 if it doesn't)
if ! gcloud artifacts repositories describe "$REPOSITORY" --location="$REGION" --project="$GCLOUD_PROJECT" &>/dev/null; then
  echo "Creating Artifact Registry repository '$REPOSITORY' in $REGION..."
  gcloud artifacts repositories create "$REPOSITORY" \
    --repository-format=docker \
    --location="$REGION" \
    --project="$GCLOUD_PROJECT" \
    --description="QualSight AI Docker images"
  echo ""
fi

# Cloud Build needs Artifact Registry Writer to push; grant it so step 1 (push) doesn't fail
PROJECT_NUM="$(gcloud projects describe "$GCLOUD_PROJECT" --format='value(projectNumber)' 2>/dev/null || true)"
if [[ -n "$PROJECT_NUM" ]]; then
  CLOUDBUILD_SA="${PROJECT_NUM}@cloudbuild.gserviceaccount.com"
  echo "Ensuring Cloud Build service account can push to Artifact Registry..."
  gcloud projects add-iam-policy-binding "$GCLOUD_PROJECT" \
    --member="serviceAccount:${CLOUDBUILD_SA}" \
    --role="roles/artifactregistry.writer" \
    --quiet \
    --project="$GCLOUD_PROJECT" &>/dev/null || true
  echo ""
fi

# Optional: capture local Docker build output for debugging (DEBUG_DEPLOY=1).
if [[ -n "${DEBUG_DEPLOY:-}" ]] && command -v docker &>/dev/null; then
  LOG_PATH="${ROOT}/.cursor/debug.log"
  echo "Running local Docker build and writing output to $LOG_PATH ..."
  docker build -t qualisight-ai:debug . 2>&1 | tee "$LOG_PATH" || true
  echo ""
fi

gcloud builds submit \
  --project "$GCLOUD_PROJECT" \
  --config=cloudbuild.yaml \
  --substitutions="_SERVICE_NAME=$SERVICE_NAME,_REGION=$REGION,_REPOSITORY=$REPOSITORY,_IMAGE_NAME=$IMAGE_NAME" \
  .

echo ""
echo "Done. Service URL will be shown in the Cloud Run console for $SERVICE_NAME in $REGION."
