"""File storage. Uses Backblaze B2 when B2_* settings exist, otherwise the local media/ folder."""
import os
from pathlib import Path

from django.conf import settings


class LocalStorage:
    name = "local"

    def _path(self, key: str) -> Path:
        path = (Path(settings.MEDIA_ROOT) / key).resolve()
        if Path(settings.MEDIA_ROOT).resolve() not in path.parents:
            raise ValueError("Bad storage key")
        return path

    def save(self, key, fileobj, content_type=None):
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "wb") as out:
            for chunk in fileobj.chunks():
                out.write(chunk)

    def open(self, key):
        return open(self._path(key), "rb")

    def delete(self, key):
        self._path(key).unlink(missing_ok=True)

    def download_url(self, key, filename):
        return None  # served through Django


class B2Storage:
    """Backblaze B2 through its S3-compatible API."""

    name = "b2"

    def __init__(self):
        import boto3

        self.bucket = os.environ["B2_BUCKET"]
        self.client = boto3.client(
            "s3",
            endpoint_url=os.environ["B2_ENDPOINT"],  # e.g. https://s3.us-west-004.backblazeb2.com
            aws_access_key_id=os.environ["B2_KEY_ID"],
            aws_secret_access_key=os.environ["B2_APP_KEY"],
        )

    def save(self, key, fileobj, content_type=None):
        extra = {"ContentType": content_type} if content_type else {}
        self.client.upload_fileobj(fileobj, self.bucket, key, ExtraArgs=extra)

    def open(self, key):
        raise NotImplementedError("B2 files are downloaded through a signed link")

    def delete(self, key):
        self.client.delete_object(Bucket=self.bucket, Key=key)

    def download_url(self, key, filename):
        return self.client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": self.bucket,
                "Key": key,
                "ResponseContentDisposition": f'attachment; filename="{filename}"',
            },
            ExpiresIn=300,
        )


def get_storage():
    if all(os.environ.get(k) for k in ("B2_KEY_ID", "B2_APP_KEY", "B2_BUCKET", "B2_ENDPOINT")):
        return B2Storage()
    return LocalStorage()
