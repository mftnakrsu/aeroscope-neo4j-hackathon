"""Central configuration for the AeroScope hackathon project (Neo4j Aura + OpenAI)."""

import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# -----------------------------------------------
# LOAD .env (optional)
# -----------------------------------------------
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    logger.warning("python-dotenv not installed; relying on process environment only")

# -----------------------------------------------
# PATHS
# -----------------------------------------------
PROJECT_ROOT = Path(os.getenv("PROJECT_ROOT", str(Path(__file__).resolve().parent.parent)))
DATA_DIR = PROJECT_ROOT / "data"
PARSED_DIR = DATA_DIR / "parsed"
LOG_DIR = PROJECT_ROOT / "logs"

# -----------------------------------------------
# NEO4J AURA
# -----------------------------------------------
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
# Set NEO4J_PASSWORD via .env file
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")

# -----------------------------------------------
# OPENAI (for enrichment, implicit linking, embeddings)
# -----------------------------------------------
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
OPENAI_EMBEDDING_DIMENSIONS = int(os.getenv("OPENAI_EMBEDDING_DIMENSIONS", "1536"))

# -----------------------------------------------
# RAG PARAMETERS
# -----------------------------------------------
TOP_K_SIMILAR = int(os.getenv("TOP_K_SIMILAR", "30"))
GRAPH_HOP_DEPTH = int(os.getenv("GRAPH_HOP_DEPTH", "2"))
MAX_CONTEXT_REQUIREMENTS = int(os.getenv("MAX_CONTEXT_REQUIREMENTS", "30"))

BM25_WEIGHT = float(os.getenv("BM25_WEIGHT", "0.3"))
VECTOR_WEIGHT = float(os.getenv("VECTOR_WEIGHT", "0.5"))
GRAPH_WEIGHT = float(os.getenv("GRAPH_WEIGHT", "0.3"))
RRF_K = int(os.getenv("RRF_K", "60"))

LLM_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "5120"))
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.1"))
