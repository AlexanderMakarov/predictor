#!/bin/sh
DIR='predictor_plugin'
echo "Pre-commit actions (NPM tests for $DIR)..."
cd $DIR && npm run test