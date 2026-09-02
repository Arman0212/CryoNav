"""
CryoNav configuration loader.
Every module imports config from here — single source of truth.
"""
import os
import yaml
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parent.parent

def load_yaml(name: str) -> dict:
    """Load a YAML config file from the config/ directory."""
    path = _PROJECT_ROOT / "config" / name
    # encoding must be explicit: a bare open() uses locale.getpreferredencoding(),
    # which is cp1252 on a default Windows install. The config files are UTF-8,
    # so "55°S" loaded as "55Â°S" and reached the API that way.
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)

def get_config() -> dict:
    """Load and merge all configuration files."""
    domain = load_yaml("domain.yaml")
    model = load_yaml("model.yaml")
    routing = load_yaml("routing.yaml")
    return {"domain": domain, "model": model, "routing": routing}

def get_project_root() -> Path:
    return _PROJECT_ROOT

# Pre-load for convenience
DOMAIN = load_yaml("domain.yaml")
MODEL = load_yaml("model.yaml")
ROUTING = load_yaml("routing.yaml")
