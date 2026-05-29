FROM python:3.12-slim
WORKDIR /app
COPY python-api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY python-api/ .
COPY data/ /data
EXPOSE 8090
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8090"]
