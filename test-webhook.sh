#!/bin/bash
# Quick test script for Resend webhook endpoint

NGROK_URL="https://cocciferous-johnette-semimystically.ngrok-free.dev"
WEBHOOK_URL="${NGROK_URL}/api/webhooks/resend"

echo "Testing webhook endpoint: ${WEBHOOK_URL}"
echo ""

# Test with a sample payload
curl -X POST "${WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -H "resend-signature: test-signature" \
  -d '{
    "type": "email.opened",
    "created_at": "2024-01-01T00:00:00.000Z",
    "data": {
      "email_id": "re_test123",
      "from": "test@example.com",
      "to": ["test@example.com"],
      "subject": "Test Email"
    }
  }'

echo ""
echo ""
echo "If you see 'received: true', the endpoint is working!"
echo "Check ngrok web interface at http://127.0.0.1:4040 to see the request"
