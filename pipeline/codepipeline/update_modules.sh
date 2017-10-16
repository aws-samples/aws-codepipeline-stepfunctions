#!/bin/bash

echo "Deleting all modules..."
rm -rf ./node_modules/

echo "Reinstalling all modules..."
npm install
