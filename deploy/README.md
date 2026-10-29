# Crucible — Deployment

Live, serverless, on AWS account `557690618983` / region `us-west-2`.

## Live URLs
- **App (share this):** https://dvbk879zy1q2l.cloudfront.net
- API (internal): https://elq4sd05dh.execute-api.us-west-2.amazonaws.com

## Architecture
```
Browser ── CloudFront (HTTPS) ──> S3  (crucible-frontend-557690618983)   static SPA
        └─ fetch /api ─────────> API Gateway HTTP API (crucible-api)
                                     └─> Lambda (crucible-api, python3.12)
                                            ├─> Bedrock  (Claude: Sonnet 4.6 + Haiku)
                                            └─> DynamoDB (crucible-memory)
```

## Cost
- Idle: ~$0–2/month (Lambda/S3/CloudFront/DynamoDB free tiers)
- Usage: ~$0.50 to $0.80 per interview session (Bedrock), plus Tavus per minute when video is on
- Guards: account concurrency limit = 10 (natural cap), `crucible-monthly` budget alert ($10, emails at 80%), CORS locked to the CloudFront domain.

## Redeploy
```bash
bash deploy/build-lambda.sh                                   # rebuild the zip
bash deploy/deploy-backend.sh                                 # update Lambda + API
CRUCIBLE_API_BASE="https://elq4sd05dh.execute-api.us-west-2.amazonaws.com" \
  bash deploy/deploy-frontend.sh                              # rebuild + push frontend
```

## Resources created (all named crucible-*)
- Lambda `crucible-api` + API Gateway HTTP API `crucible-api`
- S3 `crucible-frontend-557690618983`, `crucible-artifacts-557690618983`
- CloudFront distribution `E145DPKB7CE369` (+ OAC `crucible-oac`)
- DynamoDB `crucible-memory`
- IAM role `crucible-lambda-role`, managed policy `crucible-deploy`, budget `crucible-monthly`

## Teardown (stop all charges)
```bash
aws cloudfront get-distribution-config --id E145DPKB7CE369   # disable then delete
aws apigatewayv2 delete-api --api-id elq4sd05dh --region us-west-2
aws lambda delete-function --function-name crucible-api --region us-west-2
aws s3 rb s3://crucible-frontend-557690618983 --force
aws s3 rb s3://crucible-artifacts-557690618983 --force
aws dynamodb delete-table --table-name crucible-memory --region us-west-2
```
(DynamoDB + the IAM role/policy/budget can stay — they cost ~nothing.)
