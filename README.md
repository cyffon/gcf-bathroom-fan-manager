# Bathroom Fan Manager

Google Cloud Functions Framework と TypeScript を使ったプロジェクトです。

## セットアップ

```bash
npm install
```

## 開発

型チェックとビルドを実行します。

```bash
npm run typecheck
npm run build
```

ローカルで Functions Framework を起動する場合は、次を実行します。

```bash
npm run dev
```

起動後、`http://localhost:8080` にアクセスすると `{"status":"ok"}` が返ります。

## GitHub Actions からのデプロイ

[ワークフロー](.github/workflows/deploy.yml) は `master` への push、または GitHub の Actions 画面からの手動実行で動きます。手動実行も `master` のみが対象です。型チェック・ビルド後、HTTP 関数 `bathroomFanManager` を Node.js 22 の第2世代 Cloud Functions にデプロイします。

### GitHub に登録する値

リポジトリの **Settings → Secrets and variables → Actions → Variables → New repository variable** に登録します。

| 名前 | 必須 | 値の例・用途 |
| --- | --- | --- |
| `GCP_PROJECT_ID` | はい | `my-gcp-project`（プロジェクト ID） |
| `GCP_DEPLOY_SERVICE_ACCOUNT` | はい | `github-deployer@my-gcp-project.iam.gserviceaccount.com`（デプロイ用） |
| `GCP_RUNTIME_SERVICE_ACCOUNT` | はい | `bathroom-fan@my-gcp-project.iam.gserviceaccount.com`（関数の実行用） |
| `GCP_REGION` | いいえ | 未設定なら `asia-northeast1`（東京） |
| `GCF_FUNCTION_NAME` | いいえ | 未設定なら `bathroom-fan-manager` |

上記は `${{ vars.NAME }}` で参照します。

次の値は **Settings → Secrets and variables → Actions → Secrets → New repository secret** に登録します。

| 名前 | 必須 | 値の例・用途 |
| --- | --- | --- |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | はい | `projects/123456789012/locations/global/workloadIdentityPools/github/providers/github`（ここはプロジェクト「番号」） |

Provider のリソース名自体は秘密鍵ではありませんが、このプロジェクトでは Secrets で管理し、`${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}` で参照します。値は末尾の Provider ID だけでなく、上記形式のリソース名全体を指定してください。Secrets に保存しても、Google Cloud 側で対象リポジトリ・ブランチに認証を制限する設定は必要です。

認証には Workload Identity Federation（OIDC）を使い、サービスアカウントの JSON 秘密鍵は保存しません。

### Google Cloud 側の初期設定

GitHub の Secrets / Variables を登録するだけではデプロイできません。課金が有効なプロジェクトで次の設定も必要です。

1. Cloud Functions、Cloud Run、Cloud Build、Artifact Registry、IAM Service Account Credentials、Security Token Service の API を有効にします。
2. デプロイ用と関数実行用のサービスアカウントを作成します。
3. [認証 Action の公式手順](https://github.com/google-github-actions/auth#setting-up-workload-identity-federation) に従って Workload Identity Pool / Provider を作成します。GitHub の OIDC 発行元は `https://token.actions.githubusercontent.com` です。属性マッピングと条件で、対象の GitHub 所有者・リポジトリ・`refs/heads/master` だけを許可してください。
4. 対象リポジトリの WIF principal に、デプロイ用サービスアカウント上の `roles/iam.workloadIdentityUser` を付与します。
5. デプロイ用サービスアカウントにプロジェクト上の `roles/cloudfunctions.developer` と、関数実行用サービスアカウント上の `roles/iam.serviceAccountUser` を付与します。
6. Cloud Build が使用するサービスアカウントにもビルド権限が必要です。既定のアカウントはプロジェクト作成時期・組織ポリシーで異なるため、[Cloud Functions のビルド設定](https://cloud.google.com/functions/docs/building) に従い、使用するアカウントと必要な権限を確認してください。カスタムビルド用アカウントを使う場合は、デプロイ Action に `build_service_account` を指定し、デプロイ用アカウントからの `iam.serviceAccounts.actAs` 権限も設定します。

初回デプロイの HTTP エンドポイントは認証必須です。呼び出し元には Cloud Run Invoker（`roles/run.invoker`）などの必要な権限を別途設定します。URL は実行完了後の Actions の Summary に表示されます。

### 関数の実行時環境変数

現在の `src/index.ts` は環境変数を参照していないため、アプリ用の設定は不要です。ワークフローの `env` は Actions 内の変数であり、関数に自動では引き継がれません。`.env` ファイルもこのワークフローでは読み込みません。

将来、通常の設定値を関数へ渡す場合は、Deploy ステップの `with` に追加します。

```yaml
environment_variables: |-
  LOG_LEVEL=${{ vars.LOG_LEVEL }}
```

API トークンなどを GitHub Actions 内で使う場合は、同じ設定画面の **Secrets** に登録し `${{ secrets.NAME }}` で参照します。関数が実行時に使う機密値は Google Cloud Secret Manager に保存し、Deploy ステップの `with.secrets` で参照できます。

```yaml
secrets: |-
  API_TOKEN=projects/my-gcp-project/secrets/api-token/versions/1
```

この場合は、関数実行用サービスアカウントに該当シークレットへの `roles/secretmanager.secretAccessor` を付与します。

参考: [デプロイ Action の入力・権限](https://github.com/google-github-actions/deploy-cloud-functions)、[GitHub Variables](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables)。
