# Samaypatra

Samaypatra converts real-world student deadlines and event instructions into validated Google Calendar events.

## Current Status

Foundation setup is complete.

## Architecture

React/Vite
→ API Gateway
→ Lambda
→ Bedrock

For images/PDFs:

React
→ S3
→ Textract
→ Bedrock
→ Validation

For calendar execution:

User confirmation
→ Google OAuth
→ Google Calendar API

## Core Principle

AI proposes → application validates → user confirms → Calendar executes.
