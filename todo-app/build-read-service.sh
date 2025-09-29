#!/bin/bash

# Build script for todo-app read service
# This script builds the Docker image for the read service

set -e

# Default values
IMAGE_NAME="todo-read-service"
TAG="latest"
GITHUB_TOKEN=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -n|--name)
            IMAGE_NAME="$2"
            shift 2
            ;;
        --github-token)
            GITHUB_TOKEN="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -t, --tag TAG          Image tag (default: latest)"
            echo "  -n, --name NAME        Image name (default: todo-read-service)"
            echo "  --github-token TOKEN   GitHub token for private packages"
            echo "  -h, --help             Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

echo "Building Docker image for read service..."
echo "Image: ${IMAGE_NAME}:${TAG}"
echo "Context: src/todo-services/"
echo ""

# Build arguments
BUILD_ARGS=""
if [ ! -z "$GITHUB_TOKEN" ]; then
    BUILD_ARGS="--build-arg GITHUB_TOKEN=${GITHUB_TOKEN}"
fi

# Build the Docker image
docker build \
    ${BUILD_ARGS} \
    -t "${IMAGE_NAME}:${TAG}" \
    -f src/todo-services/read-service/Dockerfile \
    src/todo-services/

echo ""
echo "✅ Successfully built ${IMAGE_NAME}:${TAG}"