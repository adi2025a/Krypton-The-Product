# Step 1: Use an official, lightweight Python base image
FROM python:3.11-slim-bookworm

# Step 2: Install uv directly into the container
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Step 3: Set the working directory inside the container
WORKDIR /app

# Step 4: Copy dependency files first to leverage Docker caching
COPY pyproject.toml uv.lock ./

# Step 5: Install dependencies (omit --no-dev if you don't use environment groups)
RUN uv sync --frozen --no-dev

# Step 6: Copy the rest of your application code
COPY . .

# Step 7: Expose the port FastAPI will run on
EXPOSE 8000

# Step 8: Run the app using uv's virtual environment
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]