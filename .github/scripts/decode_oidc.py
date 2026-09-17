#!/usr/bin/env python3
"""Decodes and prints key claims from a GitHub OIDC JWT token for debugging."""
import sys
import base64
import json

token = sys.stdin.read().strip()
parts = token.split('.')
if len(parts) < 2:
    print("ERROR: Not a valid JWT (expected 3 parts, got", len(parts), ")")
    sys.exit(1)

payload_b64 = parts[1]
# Fix padding
payload_b64 += '=' * (4 - len(payload_b64) % 4)

try:
    claims = json.loads(base64.urlsafe_b64decode(payload_b64))
    print('iss:', claims.get('iss'))
    print('sub:', claims.get('sub'))
    print('aud:', claims.get('aud'))
    print('repository:', claims.get('repository'))
    print('ref:', claims.get('ref'))
    print('workflow:', claims.get('workflow'))
    print('job_workflow_ref:', claims.get('job_workflow_ref'))
except Exception as e:
    print('Decode error:', e)
    sys.exit(1)
