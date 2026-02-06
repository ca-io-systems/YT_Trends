#!/bin/bash
cd "/Users/rayyan/Desktop/YT Trends"

# Set HEAD to main branch pointing to the rebased commit
echo "51b112ccea49e84befd25491538f0ea1ae0e7b5e" > .git/refs/heads/main

# Update current HEAD to point to main
echo "ref: refs/heads/main" > .git/HEAD

# Remove the rebase-merge directory
rm -rf .git/rebase-merge

# Verify status
git status
git log --oneline -3
