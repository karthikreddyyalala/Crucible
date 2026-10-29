"""Tests never read a local backend/.env: it's gitignored and can hold live keys (a paid
Tavus key turned "avatar off by default" into a real call). Set before any test module
imports Settings, so settings built at import time are covered too."""
import os

from config.settings import Settings

Settings.model_config["env_file"] = None
for _name in [n for n in os.environ if n.startswith("INTERVIEWAI_TAVUS")]:
    del os.environ[_name]
