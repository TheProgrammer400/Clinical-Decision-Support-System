# AWS + GitHub Actions + OIDC: A Complete Explanation
### Using the Clinical Decision Support System (CDSS) as Context

---

## Table of Contents

1. [The Big Picture](#1-the-big-picture)
2. [All the Terminology, Explained](#2-all-the-terminology-explained)
3. [The Trust Policy, Line by Line](#3-the-trust-policy-line-by-line)
4. [The OIDC Authentication Flow in Detail](#4-the-oidc-authentication-flow-in-detail)
5. [The OIDC Error We Encountered](#5-the-oidc-error-we-encountered)
6. [How We Diagnosed and Fixed the Issue](#6-how-we-diagnosed-and-fixed-the-issue)
7. [Trust Policy vs. Permission Policy](#7-trust-policy-vs-permission-policy)
8. [Why OIDC Instead of Access Keys?](#8-why-oidc-instead-of-access-keys)
9. [The Mental Model](#9-the-mental-model)

---

## 1. The Big Picture

### What is the goal?

You have code in a GitHub repository. When you push that code, you want GitHub to automatically:

1. Build Docker images of your backend and frontend
2. Push those images to AWS (a place that stores Docker images called ECR)
3. Tell AWS to restart your running application with the new images (via ECS)

For GitHub to do any of this, it needs **permission** to access your AWS account. The question is: *how do you safely give GitHub that permission?*

---

### Two Worlds: GitHub and AWS

Everything in this setup lives in one of two places:

**GitHub's world** (runs on GitHub's servers):
- Your code repository: `TheProgrammer400/Clinical-Decision-Support-System`
- GitHub Actions: the automation system that runs when you push code
- The workflow file: `.github/workflows/cd.yml` — a script that defines what to do
- GitHub's OIDC service: a system that can generate identity tokens proving "this is GitHub Actions running for repo X"

**AWS's world** (runs on Amazon's servers, charges you money):
- Your AWS account (ID: `061179368899`)
- IAM: the access control system for your AWS account
- The IAM role `CDSSGitHubDeployRole`: a set of permissions GitHub Actions will temporarily use
- ECR: where your Docker images are stored (`cdss-backend`, `cdss-frontend`)
- ECS: where your Docker containers actually run (the `cdss-cluster-production` cluster)
- RDS: your PostgreSQL database
- STS: the AWS service that issues temporary credentials

---

### The Complete Flow (Simple Version)

```
You push code to GitHub
        |
        v
GitHub Actions wakes up (reads cd.yml)
        |
        v
GitHub generates a signed identity token
("I am GitHub Actions, running for CDSS repo")
        |
        v
GitHub sends that token to AWS STS (a doorman service)
        |
        v
AWS STS checks: "Is this token really from GitHub? Does it match our rules?"
        |
        v
AWS STS says "yes" -- issues temporary AWS credentials (like a one-day visitor pass)
        |
        v
GitHub Actions uses those credentials to push Docker images to ECR
        |
        v
GitHub Actions uses those credentials to restart ECS with the new images
        |
        v
Credentials expire automatically after ~1 hour
```

Nothing permanent is stored in GitHub. No permanent password. No permanent key. Just a one-time token that expires.

---

## 2. All the Terminology, Explained

### AWS (Amazon Web Services)

**What it is:** A massive collection of cloud computing services provided by Amazon. Instead of buying your own servers, you rent computing power, storage, databases, and more — paying only for what you use.

**Why it exists:** Running physical servers is expensive and complex. AWS lets developers focus on building apps instead of managing hardware.

**In your setup:** Your entire backend infrastructure lives on AWS — the database (RDS), the running containers (ECS), the Docker image storage (ECR), the load balancer (ALB), and the networking (VPC).

---

### AWS Account

**What it is:** A container for all your AWS resources. Think of it like a company's office building — everything inside belongs to that account and is billed to it.

**Why it exists:** AWS needs to know who to charge and who owns which resources. Every resource you create belongs to exactly one account.

**In your setup:** Your account ID is `061179368899`. Every AWS resource you created (ECR repos, ECS cluster, RDS database, etc.) lives inside this account.

---

### IAM (Identity and Access Management)

**What it is:** The security system inside AWS that controls *who* can do *what* to *which* resources.

**Why it exists:** Without IAM, anyone who accessed your AWS account could do anything — delete databases, rack up huge bills, steal data. IAM lets you define precise rules about who is allowed to perform which actions.

**In your setup:** IAM is what you configured to allow GitHub Actions (an outside entity) to push Docker images to your ECR and update your ECS service.

**Analogy:** IAM is like the security office of a building. It issues badges, defines which floors each badge can access, and validates badges at every door.

---

### IAM User

**What it is:** A permanent identity inside your AWS account representing a human or application. It has a username and a permanent password or access keys.

**Why it exists:** When a human needs long-term access to AWS (like a developer logging into the console), you create an IAM user for them.

**In your setup:** You (the developer) likely access AWS via an IAM user or your root account. However, GitHub Actions does NOT use an IAM user — it uses an IAM role instead, which is more secure.

**Analogy:** An IAM user is a permanent employee badge — it always works until you deactivate it.

---

### IAM Role

**What it is:** A temporary identity in AWS that can be *assumed* (picked up and used) by any entity that is authorized to do so. Unlike a user, a role has no permanent password. It issues short-lived credentials.

**Why it exists:** Roles exist for situations where the entity needing access is not a permanent human — it could be an automated system, a service, or (in your case) a GitHub Actions workflow. Roles are safer because their credentials expire automatically.

**In your setup:** The role `CDSSGitHubDeployRole` (ARN: `arn:aws:iam::061179368899:role/CDSSGitHubDeployRole`) is what GitHub Actions assumes. When GitHub assumes this role, it gets temporary credentials with the permissions attached to the role.

**Analogy:** An IAM role is a visitor badge at a front desk. Any authorized visitor can pick it up, use it for a day, and it automatically expires. The visitor doesn't keep the badge forever.

---

### IAM Policy

**What it is:** A JSON document that defines a set of permissions — which AWS actions are allowed or denied, on which resources.

**Why it exists:** Policies are how you specify the actual permissions in AWS. They are attached to users, roles, or groups.

**Two types matter here:**
- **Trust policy** — answers "who is allowed to assume this role?"
- **Permission policy** — answers "what is this role allowed to do once assumed?"

**In your setup:** The role `CDSSGitHubDeployRole` has:
- A **trust policy** that says "GitHub Actions for the CDSS repo is allowed to assume this role"
- **Permission policies** that say "this role can push to ECR, update ECS, and access S3"

---

### Trust Policy / Trust Relationship

**What it is:** A special policy attached specifically to an IAM *role* (not a user) that defines who or what is allowed to assume that role.

**Why it exists:** Without a trust policy, nobody can use a role. The trust policy is the gatekeeper — it explicitly lists who is trusted to pick up the visitor badge.

**In your setup:** The trust policy on `CDSSGitHubDeployRole` says:
> "GitHub's OIDC provider is allowed to assume this role, but only if the request comes from the `TheProgrammer400/Clinical-Decision-Support-System` repository."

This is what we spent most of this conversation fixing.

---

### Principal

**What it is:** In IAM, a "principal" is the entity that is allowed (or denied) to perform an action. It's the "who" in "who can do what."

**Why it exists:** IAM needs to know exactly who a permission applies to.

**Types of principals:**
- An IAM user: `arn:aws:iam::061179368899:user/some-user`
- An IAM role: `arn:aws:iam::061179368899:role/some-role`
- A **federated identity** (like GitHub via OIDC): an external identity provider

**In your setup:** The principal in the trust policy is GitHub's OIDC provider:
```
arn:aws:iam::061179368899:oidc-provider/token.actions.githubusercontent.com
```
This says: "The principal is not a specific IAM user — it's the external identity system at GitHub."

---

### Permission Policy

**What it is:** The policy that defines what actions the role is allowed to perform once it has been assumed.

**Why it exists:** Even after GitHub successfully assumes the role (passes authentication), it still needs explicit permission to do specific things like push images or update services.

**In your setup:** `CDSSGitHubDeployRole` has these permission policies attached:
- `AmazonEC2ContainerRegistryPowerUser` — allows pushing/pulling Docker images to ECR
- `AmazonECS_FullAccess` — allows updating ECS services
- A custom inline policy — allows reading from Secrets Manager and accessing S3

---

### GitHub Actions

**What it is:** GitHub's built-in automation system. When certain events happen in your repository (like a code push), GitHub Actions automatically runs scripts you define.

**Why it exists:** To automate repetitive tasks — building code, running tests, deploying to servers — so developers don't have to do them manually every time.

**In your setup:** When you push to the `aws_migration` branch, GitHub Actions runs your CD (Continuous Deployment) pipeline defined in `.github/workflows/cd.yml`. It builds Docker images and deploys them to AWS.

---

### Workflow

**What it is:** A YAML file that defines a complete automation process in GitHub Actions. It specifies when to run, what jobs to execute, and what steps each job contains.

**Why it exists:** The workflow is the "recipe" — it tells GitHub Actions exactly what to do and when.

**In your setup:** `.github/workflows/cd.yml` is your CD workflow. It triggers on pushes to `main` or `aws_migration` branches and runs a job called "Build Docker Images & Deploy".

---

### Job

**What it is:** A unit of work within a workflow. A workflow can have multiple jobs, and each job runs on a separate machine (called a "runner").

**Why it exists:** Jobs let you organize work and optionally run things in parallel.

**In your setup:** You have one job called `deploy` (displayed as "Build Docker Images & Deploy"). It runs on `ubuntu-latest` — a fresh Ubuntu Linux machine that GitHub spins up for each run.

---

### Step

**What it is:** A single task within a job. Steps run sequentially inside the same machine.

**Why it exists:** Steps let you break a job into smaller, traceable actions.

**In your setup:** Your job has these steps (in order):
1. `actions/checkout@v4` — downloads your code onto the runner machine
2. `Debug OIDC Token Claims` — (temporary debug step we added)
3. `Configure AWS Credentials` — authenticates with AWS via OIDC
4. `Log in to Amazon ECR` — gets permission to push Docker images
5. `Build & Push Backend Docker Image` — builds and uploads the backend container
6. `Build & Push Frontend Docker Image` — builds and uploads the frontend container
7. `Update ECS Service` — tells ECS to restart with the new images

---

### GitHub OIDC

**What it is:** A service built into GitHub that can issue cryptographically signed identity tokens for GitHub Actions workflows.

**Why it exists:** GitHub Actions workflows need a way to prove their identity to external services (like AWS) without storing long-lived secrets. OIDC provides a standard, secure way to do this.

**What OIDC stands for:** OpenID Connect — a standard protocol for identity verification built on top of OAuth 2.0. It's widely used across the internet for "sign in with Google/GitHub/etc."

**In your setup:** When your workflow runs, GitHub's OIDC service generates a token that says, in effect: *"This request is genuinely from GitHub Actions, running workflow `cd.yml` in repository `TheProgrammer400/Clinical-Decision-Support-System`, on branch `aws_migration`."* This token is then sent to AWS to prove GitHub's identity.

---

### OIDC Provider (in AWS)

**What it is:** A configuration inside your AWS account that tells AWS *which external identity systems to trust*. You register GitHub's OIDC endpoint with AWS so AWS knows to accept tokens from GitHub.

**Why it exists:** AWS doesn't automatically trust every identity provider in the world. You have to explicitly tell AWS: "I trust GitHub's OIDC service. If someone presents a valid GitHub OIDC token, treat it as a legitimate identity."

**In your setup:** You registered GitHub's OIDC provider in AWS with this URL: `https://token.actions.githubusercontent.com`. This is the address of GitHub's identity service. In IAM, it appears as:
```
arn:aws:iam::061179368899:oidc-provider/token.actions.githubusercontent.com
```
This was created by the Terraform resource `aws_iam_openid_connect_provider` in `iam_github_oidc.tf`.

---

### Identity Token

**What it is:** A short-lived, cryptographically signed document that proves who you are. Like a tamper-proof ID card that expires in minutes.

**Why it exists:** Unlike a password (which can be stolen and reused), identity tokens are short-lived and tied to a specific context. Even if someone intercepted the token, it would be useless shortly after.

**In your setup:** When the `Configure AWS Credentials` step runs, GitHub's OIDC service generates an identity token specifically for that workflow run. This token is sent to AWS STS to prove that the request is genuinely from your GitHub Actions workflow.

---

### JWT (JSON Web Token)

**What it is:** The specific format used for OIDC identity tokens. A JWT is a compact string made of three parts separated by dots:
```
header.payload.signature
```

- **Header:** Metadata about the token (algorithm used, token type)
- **Payload:** The actual claims (data about the identity)
- **Signature:** A cryptographic signature by GitHub, proving the token hasn't been tampered with

**Why it exists:** JWT is an open industry standard (RFC 7519) for safely passing identity information between systems. AWS knows how to read and verify JWTs from registered OIDC providers.

**In your setup:** The OIDC token GitHub generates is a JWT. In our debugging step, we decoded the payload part of this JWT to read its claims.

---

### Claims

**What it is:** The individual pieces of data inside a JWT's payload. Claims describe the identity — who issued the token, who it's for, when it expires, and what specific context it belongs to.

**Why it exists:** Claims are the actual content of the identity token. They're what AWS reads to decide whether to grant access.

**In your setup**, when we decoded the JWT, we saw these claims:
```
iss: https://token.actions.githubusercontent.com
sub: repo:TheProgrammer400@85757750/Clinical-Decision-Support-System@1348308893:ref:refs/heads/aws_migration
aud: sts.amazonaws.com
repository: TheProgrammer400/Clinical-Decision-Support-System
ref: refs/heads/aws_migration
workflow: CDSS CD Pipeline
```

Each of these is a "claim" — a fact that GitHub is asserting about the current workflow run.

---

### `sub` (Subject Claim)

**What it is:** The `sub` claim identifies the specific subject of the token — in GitHub's case, it precisely identifies which repository and context generated the token.

**Why it exists:** The `sub` claim is the most important security boundary. It's what prevents a token from GitHub repository A from being used to impersonate GitHub repository B.

**In your setup:** Your `sub` claim is:
```
repo:TheProgrammer400@85757750/Clinical-Decision-Support-System@1348308893:ref:refs/heads/aws_migration
```

Breaking this down:
- `repo:` — this token came from a repository (not an environment or pull request)
- `TheProgrammer400@85757750` — the GitHub username with its numeric user ID
- `Clinical-Decision-Support-System@1348308893` — the repository name with its numeric repo ID
- `ref:refs/heads/aws_migration` — the specific branch that triggered the workflow

The numeric IDs (`@85757750`, `@1348308893`) were added by GitHub recently as a security enhancement — they prevent issues if a username or repo name gets recycled after deletion.

**This was the root cause of our OIDC failure** — the trust policy was checking for the old format without the numeric IDs, so the `sub` claim didn't match.

---

### `aud` (Audience Claim)

**What it is:** The `aud` claim specifies who the token is *intended for*. It's like the "To:" field on a letter — it says which service should accept this token.

**Why it exists:** A token generated for AWS should not be accepted by Google Cloud or any other service. The `aud` claim ensures a token is only usable by its intended recipient.

**In your setup:** The `aud` is `sts.amazonaws.com`, meaning this token is intended specifically for AWS STS. The `aws-actions/configure-aws-credentials@v4` action automatically requests a token with this audience.

---

### AWS STS (Security Token Service)

**What it is:** An AWS service that issues *temporary* security credentials. STS is the "doorman" — you present your identity (via OIDC token), STS verifies it, and if everything checks out, STS hands you a temporary key card.

**Why it exists:** Instead of distributing permanent credentials everywhere, STS lets systems obtain short-lived credentials on demand. This dramatically reduces security risk.

**In your setup:** When GitHub Actions calls `sts:AssumeRoleWithWebIdentity`, it's talking to STS. STS validates the GitHub OIDC token, checks the trust policy on `CDSSGitHubDeployRole`, and if everything matches, issues temporary credentials.

---

### `AssumeRoleWithWebIdentity`

**What it is:** The specific STS operation that says: "I have a web identity token (like a GitHub OIDC token). I want to exchange it for temporary AWS credentials by assuming role X."

**Why it exists:** It's the bridge between the external identity world (GitHub OIDC) and the AWS credentials world (IAM roles). Without this operation, there'd be no way to convert a GitHub token into AWS credentials.

**In your setup:** The `aws-actions/configure-aws-credentials@v4` action calls `sts:AssumeRoleWithWebIdentity` behind the scenes, providing:
- The GitHub OIDC token as proof of identity
- The role ARN `arn:aws:iam::061179368899:role/CDSSGitHubDeployRole` as the role to assume

---

### Temporary AWS Credentials

**What it is:** A set of three values that STS issues after a successful `AssumeRoleWithWebIdentity` call:
- **Access Key ID** — identifies the temporary session (like a username)
- **Secret Access Key** — proves the holder is legitimate (like a password)
- **Session Token** — an additional proof that this is a temporary session, not permanent credentials

**Why it exists:** Temporary credentials expire automatically (typically after 1 hour). Even if they were stolen, they'd be useless after expiry. This is far safer than permanent access keys.

**In your setup:** After `Configure AWS Credentials` succeeds, the action sets these three values as environment variables on the GitHub Actions runner. Every subsequent AWS CLI or SDK call in the workflow automatically uses them.

---

### Access Key / Secret Key / Session Token

- **Access Key ID** (e.g., `AKIAIOSFODNN7EXAMPLE`): Identifies who you are. Safe to log. Like a username.
- **Secret Access Key**: Proves you're really you. Must be kept secret. Like a password.
- **Session Token**: An extra token required for temporary credentials. It proves STS issued these credentials.

All three together = "I am GitHub Actions, I have permission to act as `CDSSGitHubDeployRole`, and my session expires in 1 hour."

---

### `role-to-assume`

**What it is:** A parameter you specify in the `aws-actions/configure-aws-credentials` action that tells it which IAM role to assume via OIDC.

**In your setup (from `cd.yml`):**
```yaml
- name: Configure AWS Credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-region: ap-south-1
    role-to-assume: arn:aws:iam::061179368899:role/CDSSGitHubDeployRole
```

This tells the action: "Get an OIDC token from GitHub, then call STS and ask to assume `CDSSGitHubDeployRole`."

---

### GitHub Actions `id-token: write` Permission

**What it is:** A permission you must explicitly grant in your workflow for GitHub Actions to be able to generate an OIDC token.

**Why it exists:** GitHub doesn't let every workflow generate OIDC tokens by default — it's a security measure. You have to opt in by declaring `id-token: write`.

**In your setup (from `cd.yml`):**
```yaml
permissions:
  id-token: write   # Required: allows the workflow to get an OIDC token from GitHub
  contents: read    # Required: allows the workflow to read your repository code
```

Without `id-token: write`, the `ACTIONS_ID_TOKEN_REQUEST_TOKEN` and `ACTIONS_ID_TOKEN_REQUEST_URL` environment variables are not set, and the OIDC token request fails entirely.

---

## 3. The Trust Policy, Line by Line

Here is the trust policy on your `CDSSGitHubDeployRole`, with every line explained:

```json
{
  "Version": "2012-10-17",
```
> **Version:** The version of the IAM policy language. `2012-10-17` is the current version and supports all modern features like condition operators. Always use this value.

```json
  "Statement": [
```
> **Statement:** A list of individual permission rules. Each statement is one rule. You can have multiple statements in one policy.

```json
    {
      "Effect": "Allow",
```
> **Effect:** Either `"Allow"` or `"Deny"`. This statement **allows** the action.

```json
      "Principal": {
        "Federated": "arn:aws:iam::061179368899:oidc-provider/token.actions.githubusercontent.com"
      },
```
> **Principal / Federated:** Specifies who is allowed to perform the action.
>
> `"Federated"` means the principal is not an IAM user or role — it's an **external identity provider** (GitHub's OIDC service). This is in contrast to `"AWS"` (which would be an IAM user/role) or `"Service"` (which would be an AWS service like EC2).
>
> The value is the ARN of the GitHub OIDC provider you registered in your AWS account. This tells AWS: "Trust identities coming from GitHub's OIDC service."
>
> **Why GitHub needs to be a "federated" principal:** GitHub is not an AWS entity. It lives outside of AWS. To bridge the two systems, GitHub is represented as a "federated identity provider" — a trusted external system.

```json
      "Action": "sts:AssumeRoleWithWebIdentity",
```
> **Action:** The specific AWS API action being allowed. `sts:AssumeRoleWithWebIdentity` is the action that says: "Exchange a web identity token (the GitHub OIDC JWT) for temporary AWS credentials."
>
> This is the only action in a trust policy. Trust policies are specifically about who can *assume the role* — not what they can do once they have it.

```json
      "Condition": {
```
> **Condition:** Additional requirements that must be true for the statement to apply. Both conditions below must pass simultaneously.

```json
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
```
> **StringEquals / aud:** This checks the `aud` (audience) claim in the GitHub OIDC JWT.
>
> - `token.actions.githubusercontent.com:aud` means: "the `aud` claim from a token issued by GitHub"
> - The value must **exactly equal** `"sts.amazonaws.com"`
>
> **Why `sts.amazonaws.com`?** The `configure-aws-credentials` action requests an OIDC token with `sts.amazonaws.com` as the audience, meaning the token is intended specifically for AWS STS. This prevents a token intended for another service from being misused with AWS.

```json
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:TheProgrammer400/Clinical-Decision-Support-System:*"
        }
```
> **StringLike / sub:** This checks the `sub` (subject) claim in the JWT — the most important security check.
>
> - The `*` wildcard (via `StringLike`) means: "any value starting with `repo:TheProgrammer400/Clinical-Decision-Support-System:`"
>
> **Why this specific value?** The `sub` claim in GitHub's token identifies exactly which repository triggered the workflow. By requiring the sub to start with your repo path, you ensure that **only your repository** can assume this role.
>
> **How does this prevent unauthorized access?** If someone else's GitHub repository tried to assume your role, their OIDC token would have a different `sub` — AWS would reject it.

### Summary of what the trust policy says in plain English

> "Allow any identity coming from GitHub's OIDC service, **if and only if**:
> 1. The token was requested for use with AWS (`aud = sts.amazonaws.com`), AND
> 2. The token comes from my specific repository (`sub` starts with `repo:TheProgrammer400/Clinical-Decision-Support-System:`)
>
> ...to perform the action of assuming this role and getting temporary credentials."

---

## 4. The OIDC Authentication Flow in Detail

### Step 1: You Push Code to GitHub
```
git push origin aws_migration
```
This is the trigger. GitHub detects a push to a branch listed in your workflow's `on: push: branches:` section.

**What could fail here:** Nothing OIDC-related. If the push fails, it's a git/network issue.

---

### Step 2: GitHub Actions Runner Starts
GitHub allocates a fresh `ubuntu-latest` virtual machine and starts running your `cd.yml` workflow.

**What could fail here:** Workflow YAML syntax errors (which we experienced when adding the debug step).

---

### Step 3: The `Configure AWS Credentials` Step Begins
The `aws-actions/configure-aws-credentials@v4` action starts. It sees `role-to-assume` is set and determines it should use OIDC authentication.

---

### Step 4: GitHub Generates an OIDC Token
The action calls GitHub's internal OIDC endpoint using two environment variables that GitHub sets automatically when `id-token: write` is granted:
- `ACTIONS_ID_TOKEN_REQUEST_URL` — the URL of GitHub's OIDC endpoint
- `ACTIONS_ID_TOKEN_REQUEST_TOKEN` — a short-lived token to authenticate the request

GitHub's OIDC service generates a JWT containing claims like:
```json
{
  "iss": "https://token.actions.githubusercontent.com",
  "aud": "sts.amazonaws.com",
  "sub": "repo:TheProgrammer400@85757750/Clinical-Decision-Support-System@1348308893:ref:refs/heads/aws_migration",
  "repository": "TheProgrammer400/Clinical-Decision-Support-System",
  "ref": "refs/heads/aws_migration"
}
```
The token is cryptographically signed by GitHub's private key.

**What could fail here:** If `id-token: write` permission is missing, `ACTIONS_ID_TOKEN_REQUEST_TOKEN` is not set, and this step fails immediately.

---

### Step 5: The Action Calls AWS STS
The action sends a request to AWS STS:
> "I have this GitHub OIDC token. I want to assume role `arn:aws:iam::061179368899:role/CDSSGitHubDeployRole`. Please give me temporary credentials."

---

### Step 6: AWS STS Validates the JWT
AWS STS verifies the JWT by:

1. **Looking up the OIDC provider:** STS extracts the `iss` claim and looks for a registered OIDC provider with that URL in your AWS account.
2. **Fetching GitHub's public keys:** STS retrieves GitHub's public keys from `https://token.actions.githubusercontent.com/.well-known/jwks`.
3. **Verifying the signature:** STS uses GitHub's public key to verify the JWT hasn't been tampered with.
4. **Checking the audience:** STS checks the `aud` claim matches `sts.amazonaws.com`.

**What could fail here:** If the JWT's signature can't be verified, AWS rejects the request. In CloudTrail, this appears as `AccessDenied` with **null `requestParameters`**.

---

### Step 7: AWS Evaluates the Trust Policy
If the JWT is valid, STS looks up the requested role and evaluates its trust policy. It checks:

1. Is the principal (`oidc-provider/token.actions.githubusercontent.com`) the same as where this token came from? ✓
2. Does the `aud` claim equal `sts.amazonaws.com`? ✓
3. Does the `sub` claim match the pattern in the policy? **← This is what was failing**

If any condition fails, STS returns `AccessDenied: Not authorized to perform sts:AssumeRoleWithWebIdentity`.

---

### Step 8: STS Issues Temporary Credentials
If all checks pass, STS generates:
```
AWS_ACCESS_KEY_ID=ASIA...
AWS_SECRET_ACCESS_KEY=...
AWS_SESSION_TOKEN=...
```
These expire after 1 hour. The action sets these as environment variables on the runner.

---

### Step 9: Subsequent Steps Use the Credentials
Every AWS CLI command in the remaining steps automatically picks up these environment variables:
- `docker push` to ECR
- `aws ecs update-service` to restart the service

**What could fail here:** The role has credentials (authentication worked), but the role's *permission policies* don't allow the specific action. This produces a different `AccessDenied` — from ECR/ECS, not from STS.

---

### Step 10: Credentials Expire
After ~1 hour, the temporary credentials automatically become invalid with no manual action needed.

---

## 5. The OIDC Error We Encountered

```
Could not assume role with OIDC: Not authorized to perform sts:AssumeRoleWithWebIdentity
```

### What exactly does this error mean?
This error is generated by `aws-actions/configure-aws-credentials` when STS returns an `AccessDenied` response to the `AssumeRoleWithWebIdentity` API call. It means AWS STS refused to issue temporary credentials.

### Which component generated it?
AWS STS generated the underlying rejection. The action caught that error and displayed it in GitHub Actions logs. The action retried 12 times ("Assuming role with OIDC" repeated in the logs) before giving up.

### Why AWS rejected it
The `sub` claim in the OIDC token did not match the pattern in the trust policy.

**Token `sub` claim (what GitHub actually sent):**
```
repo:TheProgrammer400@85757750/Clinical-Decision-Support-System@1348308893:ref:refs/heads/aws_migration
```

**Trust policy expected:**
```
repo:TheProgrammer400/Clinical-Decision-Support-System:*
```

The token contained `@85757750` and `@1348308893` (numeric user/repo IDs added by GitHub) — but the trust policy pattern didn't include them. The comparison failed.

### What kinds of problems can cause this error?

| Cause | What's wrong |
|---|---|
| `sub` claim mismatch | Trust policy pattern doesn't match the actual sub claim (our issue) |
| Wrong `aud` claim | Trust policy requires a different audience value |
| OIDC provider not registered | AWS doesn't have the GitHub OIDC provider configured |
| Wrong OIDC provider ARN | Trust policy references a different OIDC provider |
| Token JWT validation failure | AWS can't verify GitHub's signature |
| Missing `id-token: write` | Workflow can't get a token at all |
| Wrong role ARN | The requested role doesn't exist in your account |

### How to distinguish OIDC failure from AWS permission failure

| Type | Error Source | CloudTrail `requestParameters` | Error Message |
|---|---|---|---|
| OIDC/trust failure | AWS STS | **null** (request not processed) | `Not authorized to perform sts:AssumeRoleWithWebIdentity` |
| Permission failure | AWS ECR/ECS/S3 | Populated (request was processed) | `AccessDenied` with specific resource |

When `requestParameters` is **null** in CloudTrail, the rejection happened before the request was even parsed — typically a trust policy or JWT validation failure.

---

## 6. How We Diagnosed and Fixed the Issue

### What we inspected

1. **The workflow file (`cd.yml`):** Confirmed `id-token: write` was set, `role-to-assume` was correctly set, `aws-region: ap-south-1` was set. All correct.

2. **The live IAM trust policy:** Confirmed the trust policy existed and referenced the correct OIDC provider ARN. Correct.

3. **The OIDC provider:** Confirmed it was registered with the correct `ClientIDList: ["sts.amazonaws.com"]`. Correct.

4. **AWS CloudTrail:** Found that every failed `AssumeRoleWithWebIdentity` event had **null `requestParameters`** — the rejection was happening before STS could even parse the request.

5. **TLS thumbprint:** Found a new thumbprint not present in the OIDC provider. We added it — but this did **not** resolve the issue (AWS stopped requiring thumbprint verification for GitHub in 2023).

6. **OIDC token claims (debug step):** Decoded the actual JWT being sent to AWS and found:
   ```
   sub: repo:TheProgrammer400@85757750/Clinical-Decision-Support-System@1348308893:ref:refs/heads/aws_migration
   ```

### What was correct
- IAM role existed with the right ARN
- OIDC provider was registered in AWS
- `id-token: write` was present in the workflow
- The `aud` claim matched the trust policy condition
- Terraform config matched actual AWS state

### What was wrong

**Confirmed:** The `sub` claim contained numeric IDs (`@85757750`, `@1348308893`) in the new GitHub OIDC format, but the trust policy's `StringLike` condition expected the old format without them.

This was discovered when we added the debug step to print the actual JWT claims.

### What we changed

Updated the trust policy's `StringLike` condition:

```json
"StringLike": {
  "token.actions.githubusercontent.com:sub": [
    "repo:TheProgrammer400@85757750/Clinical-Decision-Support-System@1348308893:*",
    "repo:TheProgrammer400/Clinical-Decision-Support-System:*",
    "repo:theprogrammer400/clinical-decision-support-system:*"
  ]
}
```

Applied via `terraform apply` → `Apply complete! Resources: 0 added, 1 changed, 0 destroyed.`

### Was the fix confirmed as successful?

**Yes.** After applying the trust policy fix, the next pipeline run showed:
- `Configure AWS Credentials`: **Succeeded** — `Authenticated as assumedRoleId AROAQ4PUTCXB22G7H7SHC:GitHubActions`
- `Log in to Amazon ECR`: Succeeded
- `Build & Push Backend`: Succeeded
- `Build & Push Frontend`: Failed — but for a **different, unrelated reason** (missing `/app/public` directory in Dockerfile)

**Conclusion:** The OIDC authentication issue was definitively resolved by updating the trust policy `sub` condition to match GitHub's new numeric ID format.

---

## 7. Trust Policy vs. Permission Policy

```
Trust Policy      = The DOOR. Who is allowed in?
Permission Policy = The KEYCARD PERMISSIONS. What can they access once inside?
```

### Trust Policy — "Who can assume this role?"

The trust policy answers one question only: **is this entity allowed to pick up this role?**

In your setup, the trust policy says:
> "Only GitHub Actions running for the `TheProgrammer400/Clinical-Decision-Support-System` repository may assume `CDSSGitHubDeployRole`."

If the trust policy check fails, you get `Not authorized to perform sts:AssumeRoleWithWebIdentity`.

The trust policy says **nothing** about what GitHub can do once it has the role.

### Permission Policy — "What can the assumed role do?"

Once GitHub Actions successfully assumes `CDSSGitHubDeployRole`, the permission policies define what it can actually do:

| Policy | What it allows |
|---|---|
| `AmazonEC2ContainerRegistryPowerUser` | Push/pull Docker images to/from ECR |
| `AmazonECS_FullAccess` | Create/update/delete ECS clusters, services, tasks |
| `CDSSGitHubDeployAdditionalPolicy` (custom) | Read secrets from Secrets Manager, access S3 |

### A Concrete Example

Imagine GitHub Actions successfully assumes the role (trust policy passed). Then the pipeline tries to delete your RDS database:

```bash
aws rds delete-db-instance --db-instance-identifier my-db
```

This would fail with `AccessDenied` — because the permission policies on `CDSSGitHubDeployRole` don't include `rds:DeleteDBInstance`. The role doesn't have permission for that.

This is the principle of **least privilege** — the role is only granted the specific permissions needed for deployment, nothing more.

### How the two work together

```
Is GitHub Actions allowed to assume the role?
    --> Trust Policy decides (OIDC token + sub/aud conditions)

If yes --> temporary credentials issued

Can those credentials push to ECR?
    --> Permission Policy decides (AmazonEC2ContainerRegistryPowerUser)

Can those credentials update ECS?
    --> Permission Policy decides (AmazonECS_FullAccess)

Can those credentials delete the database?
    --> Permission Policy decides --> NO, not allowed
```

Two separate gatekeepers. Both must say "yes" for an action to succeed.

---

## 8. Why OIDC Instead of AWS Access Keys?

### The Old Way: Storing Permanent Access Keys in GitHub Secrets

Before OIDC, developers would:
1. Create an IAM user in AWS
2. Generate a permanent Access Key ID + Secret Access Key
3. Store both in GitHub as repository secrets
4. Use them in the workflow:
   ```yaml
   - uses: aws-actions/configure-aws-credentials@v4
     with:
       aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
       aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
   ```

### Problems with Permanent Access Keys

| Problem | Why it matters |
|---|---|
| **They never expire** | If leaked, an attacker has permanent AWS access until you manually revoke them |
| **GitHub could be breached** | If someone accesses your GitHub secrets, they have your AWS keys forever |
| **Hard to rotate** | Changing keys requires updating GitHub secrets manually |
| **No workflow-level scoping** | Any workflow in the repo (or a fork!) could use the keys |
| **Audit difficulty** | Hard to tell if keys were compromised |

### The OIDC Way: Temporary, Scoped Credentials

With OIDC:
- **No secrets stored anywhere** — GitHub generates the OIDC token on the fly
- **Credentials expire in ~1 hour** — Even intercepted credentials would be useless quickly
- **Scoped to specific workflows** — Trust policy's `sub` condition ensures only your repo can assume the role
- **Tied to the specific run context** — The OIDC token encodes the exact branch, workflow, and repository
- **Automatic rotation** — Fresh credentials every single workflow run
- **Auditable** — CloudTrail logs every `AssumeRoleWithWebIdentity` call

### Side-by-Side Comparison

| | Permanent Access Keys | OIDC Temporary Credentials |
|---|---|---|
| Stored in GitHub | Yes (secrets) | No |
| Expiry | Never | ~1 hour |
| Revocation if compromised | Manual | Automatic (already expired) |
| Scoped to specific repo | No | Yes (via `sub` claim) |
| Scoped to specific branch | No | Yes (via `sub` claim) |
| Requires secret rotation | Yes | No |

OIDC is the modern, recommended approach for all GitHub Actions to AWS integrations.

---

## 9. The Mental Model

Here is the complete authorization chain:

```
+-------------------------------------------------------------+
|                        GITHUB WORLD                         |
|                                                             |
|  You push code                                              |
|       |                                                     |
|       v                                                     |
|  GitHub Actions wakes up (reads cd.yml)                     |
|       |                                                     |
|       v                                                     |
|  GitHub OIDC issues an identity token (JWT)                 |
|  "I am GitHub Actions, repo=CDSS, branch=aws_migration"     |
|       |                                                     |
+-------|-----------------------------------------------------+
        | Token sent over internet
        v
+-------------------------------------------------------------+
|                        AWS WORLD                            |
|                                                             |
|  AWS STS receives the token                                 |
|       |                                                     |
|       v                                                     |
|  STS validates the JWT signature (is this really GitHub?)   |
|       |                                                     |
|       v                                                     |
|  STS checks the IAM role's TRUST POLICY                     |
|  "Does the sub claim match? Does the aud claim match?"      |
|       |                                                     |
|       v (if yes)                                            |
|  STS issues TEMPORARY CREDENTIALS (expire in 1 hour)        |
|  AccessKeyId + SecretAccessKey + SessionToken               |
|       |                                                     |
|       v                                                     |
|  GitHub Actions uses credentials -- next steps run          |
|       |                                                     |
|       v                                                     |
|  Each AWS action is checked against PERMISSION POLICIES     |
|  "Is CDSSGitHubDeployRole allowed to push to ECR?"          |
|  "Is CDSSGitHubDeployRole allowed to update ECS?"           |
|       |                                                     |
|       v (if yes to each)                                    |
|  AWS executes the action                                     |
|                                                             |
|  [ECR]  Docker images stored                                |
|  [ECS]  New containers deployed                             |
|  [RDS]  Database available to the app                       |
|                                                             |
+-------------------------------------------------------------+
```

### The Three Questions to Ask When Something Goes Wrong

**Question 1: Did GitHub get an OIDC token?**
- Check: Is `id-token: write` in the workflow permissions?
- Error if no: GitHub can't even request a token

**Question 2: Did STS accept the token and issue credentials?**
- Check: Does the `sub`/`aud` in the token match the trust policy?
- Error if no: `Not authorized to perform sts:AssumeRoleWithWebIdentity`
- Diagnostic: CloudTrail `requestParameters` will be **null**

**Question 3: Did the IAM role have permission to do the action?**
- Check: Are the right permission policies attached to the role?
- Error if no: `AccessDenied` from ECR/ECS/S3/etc.
- Diagnostic: CloudTrail `requestParameters` will be **populated**

### One-Sentence Summary of Each Component

| Component | One sentence |
|---|---|
| **GitHub OIDC token** | GitHub's proof that "this is really my Actions workflow running for this specific repo" |
| **AWS OIDC Provider** | Your AWS account's registration to trust tokens from GitHub |
| **Trust Policy** | The rule saying "GitHub can assume this role, but only from my specific repo" |
| **STS AssumeRoleWithWebIdentity** | The exchange: "here's my GitHub token -- give me temporary AWS credentials" |
| **Temporary Credentials** | A one-hour AWS keycard with the role's permissions |
| **Permission Policy** | The list of AWS actions the keycard unlocks |

---

*This document was written in the context of the CDSS project (`TheProgrammer400/Clinical-Decision-Support-System`)
using the actual configuration files, AWS resources, and troubleshooting steps from the project's AWS migration.*
