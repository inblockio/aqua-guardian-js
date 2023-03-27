#!/usr/bin/env bash
set -ex
cd /mountPoint/aqua-guardian-js || return
# set guardian.js to connect to wiki
npm install
node index.js

