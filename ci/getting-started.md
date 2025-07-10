# CI

## Publish `@tklein1801/ce-async-api-fix`

```bash
fly -t kleithor set-pipeline -p ce-async-api-fix -c ./ci/publish.pipeline.yml -v repo_uri="git@github.com:tklein1801/ce-async-api-fix.git" -v repo_private_key="$(cat ./ci/secrets/github/id_rsa)" -v version_bucket="$(cat ./ci/secrets/aws/bucket.txt | sed -n '3p')" -v service="ce_async_api_fix" -v service_name="ce-async-api-fix" -v version_bucket_region="$(cat ./ci/secrets/aws/bucket.txt | sed -n '4p')" -v version_bucket_access_key="$(cat ./ci/secrets/aws/bucket.txt | sed -n '1p')" -v version_bucket_secret="$(cat ./ci/secrets/aws/bucket.txt | sed -n '2p')" -v npm_token="$(cat ./ci/secrets/npmjs/npm_token)" -v discord_webhook="$(cat ./ci/secrets/discord-webhook.txt)"
```
