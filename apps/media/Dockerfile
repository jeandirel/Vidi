FROM python:3.11-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core libsndfile1 git ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
ARG INSTALL_TTS=false
COPY requirements-tts.txt ./
RUN if [ "$INSTALL_TTS" = "true" ]; then pip install --no-cache-dir -r requirements-tts.txt; fi
RUN useradd --uid 10001 --create-home media && mkdir /data && chown media:media /data
COPY pipeline.py server.py ./
USER media
ENV MEDIA_DATA_DIR=/data
EXPOSE 8000
# Exactly one process; SQLite state and model inference are deliberately serialized.
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--no-access-log"]
