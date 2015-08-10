#!/bin/bash
echo "MASTER UPDATED. Deploying master.." | wall
cd master
git fetch origin master
git reset --hard origin/master
git pull origin master
git reset --hard origin/master
forever restart app.js
echo "Deployed." | wall

