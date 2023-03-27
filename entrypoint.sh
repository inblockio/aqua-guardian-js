#!/usr/bin/env bash
set -ex
cd /mountPoint/guardian || return
# set guardian.js to connect to wiki
npm install
node index.js

