.PHONY: help install generate parse schema load entities enrich embed link all clean

help:
	@echo "AeroScope — Makefile targets"
	@echo ""
	@echo "  make install    Install Python dependencies (pip install -r requirements.txt)"
	@echo "  make generate   Generate 1000 synthetic requirements into data/synthetic/"
	@echo "  make parse      Parse MD exports into JSONL"
	@echo "  make schema     Apply Neo4j schema (constraints + vector index) via cypher-shell"
	@echo "  make load       Load requirements into Aura graph (clears existing data)"
	@echo "  make entities   Extract aerospace entities (standards, components, interfaces, ...)"
	@echo "  make enrich     LLM enrich each requirement (summary + classification)"
	@echo "  make embed      Compute embeddings and write them to Aura"
	@echo "  make link       Discover implicit semantic relationships via LLM"
	@echo "  make all        Run the full pipeline end-to-end"
	@echo "  make clean      Remove generated JSONL and __pycache__"

install:
	pip install -r requirements.txt

generate:
	python -m src.generate_corpus --count 1000 --output data/synthetic/

parse:
	python -m src.md_to_jsonl data/synthetic/ data/synthetic/requirements.jsonl

schema:
	cat aura/schema.cypher | cypher-shell -a $$NEO4J_URI -u $$NEO4J_USER -p $$NEO4J_PASSWORD

load:
	python -m src.graph_builder -i data/synthetic/requirements.jsonl --clear

entities:
	python -m src.entity_extractor -i data/synthetic/requirements.jsonl

enrich:
	python -m src.requirement_enricher -i data/synthetic/requirements.jsonl

embed:
	python -m src.compute_embeddings -i data/synthetic/requirements.jsonl

link:
	python -m src.implicit_linker

all: install generate parse schema load entities enrich embed link

clean:
	rm -rf data/synthetic/*.jsonl
	find . -type d -name __pycache__ -exec rm -rf {} +
