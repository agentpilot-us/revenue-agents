#!/bin/bash
# Test script for company research endpoint

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Testing Company Research Endpoint"
echo ""

# Check if company ID is provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: Company ID required${NC}"
  echo "Usage: ./test-research.sh <companyId>"
  echo ""
  echo "To get a company ID:"
  echo "1. Visit http://localhost:3000/dashboard/companies"
  echo "2. Click on a company"
  echo "3. Copy the ID from the URL (e.g., /dashboard/companies/cmljnikkh00008k3bkl9xwp66)"
  exit 1
fi

COMPANY_ID=$1
BASE_URL="${2:-http://localhost:3000}"
RESEARCH_URL="${BASE_URL}/api/companies/${COMPANY_ID}/research"

echo "Company ID: ${COMPANY_ID}"
echo "URL: ${RESEARCH_URL}"
echo ""
echo -e "${YELLOW}Note: This requires authentication. Make sure you're logged in and have a valid session cookie.${NC}"
echo ""
echo "Testing research endpoint..."
echo ""

# Make the request
curl -X POST "${RESEARCH_URL}" \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat ~/.cursor/cookies.txt 2>/dev/null || echo '')" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -v 2>&1 | tee /tmp/research-test.log

echo ""
echo -e "${GREEN}Check the output above for:${NC}"
echo "  - HTTP Status should be 200"
echo "  - Response should contain 'data' field with research results"
echo ""
echo -e "${YELLOW}If you see errors:${NC}"
echo "  1. Check server terminal for detailed error logs"
echo "  2. Verify ANTHROPIC_API_KEY is set in .env.local"
echo "  3. Verify PERPLEXITY_API_KEY is set in .env.local"
echo "  4. Make sure you're logged in (session cookie required)"
