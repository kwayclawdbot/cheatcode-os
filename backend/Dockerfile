FROM python:3.12-slim

WORKDIR /app

# Install system deps for yt-dlp
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

# Install Python deps (explicit list, not from pyproject.toml)
RUN pip install --no-cache-dir fastapi "uvicorn[standard]" supabase anthropic httpx pydantic pydantic-settings python-dotenv yt-dlp openai numpy pandas redis apscheduler stripe feedparser beautifulsoup4 yfinance

COPY app/ app/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
