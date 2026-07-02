"""Storage abstraction. JsonStore implements it for the local MVP;
a SupabaseStore can replace it without touching the services."""

from abc import ABC, abstractmethod


class Store(ABC):
    @abstractmethod
    def list(self, collection):
        """Return all items of a collection (list of dicts)."""

    @abstractmethod
    def get(self, collection, item_id):
        """Return one item by id, or None."""

    @abstractmethod
    def insert(self, collection, item):
        """Insert an item (must contain 'id'). Returns the item."""

    @abstractmethod
    def update(self, collection, item_id, changes):
        """Shallow-merge changes into the item. Returns updated item or None."""

    @abstractmethod
    def delete(self, collection, item_id):
        """Delete by id. Returns True if something was deleted."""

    @abstractmethod
    def lock(self):
        """Context manager guarding multi-collection mutations."""
