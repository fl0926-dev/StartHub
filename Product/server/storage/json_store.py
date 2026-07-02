import json
import os
import tempfile
import threading
import uuid
from datetime import datetime, timezone

from server import config
from server.storage.base import Store

# One lock for the whole store: every mutation that touches more than one
# collection (e.g. charge tokens + insert thread) must run inside store.lock().
_LOCK = threading.RLock()


def new_id(prefix):
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class JsonStore(Store):
    def __init__(self, data_dir=None):
        self.data_dir = data_dir or config.DATA_DIR
        os.makedirs(self.data_dir, exist_ok=True)
        self._cache = {}

    def _path(self, collection):
        return os.path.join(self.data_dir, f"{collection}.json")

    def _read(self, collection):
        if collection in self._cache:
            return self._cache[collection]
        path = self._path(collection)
        if not os.path.exists(path):
            items = []
        else:
            with open(path, "r", encoding="utf-8") as f:
                items = json.load(f).get("items", [])
        self._cache[collection] = items
        return items

    def _write(self, collection, items):
        # Atomic write: full dump to a temp file in the same dir, then rename.
        path = self._path(collection)
        fd, tmp = tempfile.mkstemp(dir=self.data_dir, suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump({"items": items}, f, ensure_ascii=False, indent=2)
            os.replace(tmp, path)
        except BaseException:
            if os.path.exists(tmp):
                os.unlink(tmp)
            raise
        self._cache[collection] = items

    def lock(self):
        return _LOCK

    def list(self, collection):
        # Per-item copies: callers must never mutate the shared cache.
        with _LOCK:
            return [dict(item) for item in self._read(collection)]

    def get(self, collection, item_id):
        with _LOCK:
            for item in self._read(collection):
                if item["id"] == item_id:
                    return dict(item)
        return None

    def insert(self, collection, item):
        with _LOCK:
            items = self._read(collection)
            items.append(item)
            self._write(collection, items)
        return item

    def update(self, collection, item_id, changes):
        with _LOCK:
            items = self._read(collection)
            for i, item in enumerate(items):
                if item["id"] == item_id:
                    items[i] = {**item, **changes}
                    self._write(collection, items)
                    return dict(items[i])
        return None

    def delete(self, collection, item_id):
        with _LOCK:
            items = self._read(collection)
            kept = [i for i in items if i["id"] != item_id]
            if len(kept) != len(items):
                self._write(collection, kept)
                return True
        return False


_store = None


def get_store():
    global _store
    if _store is None:
        _store = JsonStore()
    return _store
