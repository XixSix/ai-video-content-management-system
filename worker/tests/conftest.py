import os

os.environ.setdefault("RABBITMQ_URL", "amqp://guest:guest@localhost:5672//")
os.environ.setdefault(
    "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres"
)
os.environ.setdefault("S3_ENDPOINT", "http://localhost:9000")
os.environ.setdefault("S3_BUCKET", "vidpilot-media")
os.environ.setdefault("S3_ACCESS_KEY_ID", "minio")
os.environ.setdefault("S3_SECRET_ACCESS_KEY", "minio-secret")
