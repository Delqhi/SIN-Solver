"""
🎼 CONDUCTOR TRACK ORCHESTRATION (MODULE 19)
============================================
The Symphonic Logic of the Empire.
Manages the hierarchical execution of tasks: Symphony -> Track -> Movement -> Shard.
"""

import asyncio
import logging
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field, asdict
from enum import Enum
import uuid
import time
import json
import redis

logger = logging.getLogger("Conductor")

class ConductorStatus(Enum):
    PENDING = "pending"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class Shard:
    """Atomic Unit of Work (The Note)"""
    id: str
    name: str
    payload: Dict[str, Any]
    status: ConductorStatus = ConductorStatus.PENDING
    result: Optional[Any] = None
    retry_count: int = 0
    max_retries: int = 3

@dataclass
class Movement:
    """Logical Grouping of Shards (The Bar)"""
    id: str
    name: str
    shards: List[Shard] = field(default_factory=list)
    status: ConductorStatus = ConductorStatus.PENDING
    parallel: bool = False

@dataclass
class Track:
    """High-Level Workflow (The Instrument)"""
    id: str
    name: str
    movements: List[Movement] = field(default_factory=list)
    status: ConductorStatus = ConductorStatus.PENDING
    priority: int = 1

@dataclass
class Symphony:
    """The Master Plan (The Composition)"""
    id: str
    name: str
    tracks: List[Track] = field(default_factory=list)
    status: ConductorStatus = ConductorStatus.PENDING
    started_at: float = 0.0
    ended_at: float = 0.0

class Conductor:
    """
    The Orchestrator of the Swarm.
    """
    def __init__(self):
        self.lock = asyncio.Lock()
        self._init_redis()
    
    def _init_redis(self):
        """Initialize Redis client with fallback to localhost"""
        try:
            self.redis_client = redis.Redis(
                host='room-04-redis-cache',
                port=6379,
                db=2,
                decode_responses=True,
                socket_connect_timeout=5
            )
            self.redis_client.ping()
            logger.info("✅ Connected to Redis at room-04-redis-cache:6379")
        except Exception as e:
            logger.warning(f"⚠️  Failed to connect to room-04-redis-cache, falling back to localhost: {e}")
            try:
                self.redis_client = redis.Redis(
                    host='localhost',
                    port=6379,
                    db=2,
                    decode_responses=True,
                    socket_connect_timeout=5
                )
                self.redis_client.ping()
                logger.info("✅ Connected to Redis at localhost:6379")
            except Exception as e2:
                logger.error(f"❌ Failed to connect to Redis: {e2}")
                raise
    
    def _serialize_symphony(self, symphony: Symphony) -> str:
        """Convert Symphony dataclass to JSON string"""
        return json.dumps(asdict(symphony), default=str)
    
    def _deserialize_symphony(self, data: str) -> Symphony:
        """Convert JSON string back to Symphony dataclass"""
        obj = json.loads(data)
        
        # Reconstruct nested dataclasses
        tracks = []
        for track_data in obj.get('tracks', []):
            movements = []
            for movement_data in track_data.get('movements', []):
                shards = []
                for shard_data in movement_data.get('shards', []):
                    shard = Shard(
                        id=shard_data['id'],
                        name=shard_data['name'],
                        payload=shard_data['payload'],
                        status=ConductorStatus(shard_data['status']),
                        result=shard_data.get('result'),
                        retry_count=shard_data.get('retry_count', 0),
                        max_retries=shard_data.get('max_retries', 3)
                    )
                    shards.append(shard)
                
                movement = Movement(
                    id=movement_data['id'],
                    name=movement_data['name'],
                    shards=shards,
                    status=ConductorStatus(movement_data['status']),
                    parallel=movement_data.get('parallel', False)
                )
                movements.append(movement)
            
            track = Track(
                id=track_data['id'],
                name=track_data['name'],
                movements=movements,
                status=ConductorStatus(track_data['status']),
                priority=track_data.get('priority', 1)
            )
            tracks.append(track)
        
        symphony = Symphony(
            id=obj['id'],
            name=obj['name'],
            tracks=tracks,
            status=ConductorStatus(obj['status']),
            started_at=obj.get('started_at', 0.0),
            ended_at=obj.get('ended_at', 0.0)
        )
        return symphony
    
    def _save_symphony(self, symphony: Symphony) -> None:
        """Save symphony to Redis"""
        key = f"symphony:{symphony.id}"
        serialized = self._serialize_symphony(symphony)
        self.redis_client.set(key, serialized)
        logger.debug(f"💾 Saved symphony {symphony.id} to Redis")
    
    def _get_symphony(self, symphony_id: str) -> Optional[Symphony]:
        """Retrieve symphony from Redis"""
        key = f"symphony:{symphony_id}"
        data = self.redis_client.get(key)
        if not data:
            return None
        return self._deserialize_symphony(data)
    
    def _delete_symphony(self, symphony_id: str) -> None:
        """Delete symphony from Redis"""
        key = f"symphony:{symphony_id}"
        self.redis_client.delete(key)
        logger.debug(f"🗑️  Deleted symphony {symphony_id} from Redis")

    def compose_symphony(self, name: str) -> Symphony:
        symphony = Symphony(
            id=str(uuid.uuid4()),
            name=name
        )
        self._save_symphony(symphony)
        logger.info(f"🎼 New Symphony composed: {name} ({symphony.id})")
        return symphony

    def add_track_to_symphony(self, symphony_id: str, track_name: str, priority: int = 1) -> Track:
        symphony = self._get_symphony(symphony_id)
        if not symphony:
            raise ValueError(f"Symphony {symphony_id} not found")
        
        track = Track(
            id=str(uuid.uuid4()),
            name=track_name,
            priority=priority
        )
        symphony.tracks.append(track)
        self._save_symphony(symphony)
        return track

    def add_movement_to_track(self, symphony_id: str, track_id: str, movement_name: str, parallel: bool = False) -> Movement:
        symphony = self._get_symphony(symphony_id)
        if not symphony:
            raise ValueError(f"Symphony {symphony_id} not found")
        
        track = next((t for t in symphony.tracks if t.id == track_id), None)
        if not track:
            raise ValueError(f"Track {track_id} not found")

        movement = Movement(
            id=str(uuid.uuid4()),
            name=movement_name,
            parallel=parallel
        )
        track.movements.append(movement)
        self._save_symphony(symphony)
        return movement

    def add_shard_to_movement(self, symphony_id: str, track_id: str, movement_id: str, shard_name: str, payload: Dict) -> Shard:
        symphony = self._get_symphony(symphony_id)
        if not symphony: raise ValueError("Symphony not found")
        
        track = next((t for t in symphony.tracks if t.id == track_id), None)
        if not track: raise ValueError("Track not found")
        
        movement = next((m for m in track.movements if m.id == movement_id), None)
        if not movement: raise ValueError("Movement not found")

        shard = Shard(
            id=str(uuid.uuid4()),
            name=shard_name,
            payload=payload
        )
        movement.shards.append(shard)
        self._save_symphony(symphony)
        return shard

    async def start_symphony(self, symphony_id: str):
        symphony = self._get_symphony(symphony_id)
        if not symphony: return
        
        logger.info(f"🎼 Starting Symphony: {symphony.name}")
        symphony.status = ConductorStatus.ACTIVE
        symphony.started_at = time.time()
        self._save_symphony(symphony)
        
        return symphony

    def get_status(self, symphony_id: str) -> Dict:
        symphony = self._get_symphony(symphony_id)
        if not symphony: return {"error": "Not found"}
        
        return {
            "id": symphony.id,
            "name": symphony.name,
            "status": symphony.status.value,
            "tracks_count": len(symphony.tracks),
            "progress": "0%" # Todo: calc progress
        }
