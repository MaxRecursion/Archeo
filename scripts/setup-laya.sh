#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -x .venv-laya/bin/python ]; then
  py="${PYTHON:-python3.12}"
  "$py" -c 'import sys; assert sys.version_info >= (3,12), "The pinned Laya runtime requires Python 3.12+"'
  "$py" -m venv .venv-laya
fi
.venv-laya/bin/python -c 'import sys; assert sys.version_info >= (3,12), "Recreate .venv-laya using Python 3.12+"'
.venv-laya/bin/python -m pip install -r runtime/requirements-laya.lock.txt
