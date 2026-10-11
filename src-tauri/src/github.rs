//! Publishes a draft from Prox straight into a pull request on saranmahadev/blog.
//! Kept server-side (Rust) rather than called from the webview: GitHub credentials
//! never touch the frontend, and the OS keychain is the only place the token lives.

use keyring::Entry;
use percent_encoding::{AsciiSet, NON_ALPHANUMERIC, utf8_percent_encode};
use serde::{Deserialize, Serialize};

const OWNER: &str = "saranmahadev";
const REPO: &str = "blog";
const KEYRING_SERVICE: &str = "prox-blog-publish";
const KEYRING_USER: &str = "github-token";

const PATH_SAFE: &AsciiSet = &NON_ALPHANUMERIC
  .remove(b'.')
  .remove(b'-')
  .remove(b'_')
  .remove(b'~')
  .remove(b'/');

fn encode_path(path: &str) -> String {
  utf8_percent_encode(path, PATH_SAFE).to_string()
}

fn token_entry() -> Result<Entry, String> {
  Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|e| e.to_string())
}

/// Stores the fine-grained GitHub PAT in the OS keychain. Scope it to
/// `contents:write` + `pull_requests:write` on saranmahadev/blog only.
#[tauri::command]
pub fn set_github_token(token: String) -> Result<(), String> {
  token_entry()?
    .set_password(&token)
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn has_github_token() -> Result<bool, String> {
  match token_entry()?.get_password() {
    Ok(_) => Ok(true),
    Err(keyring::Error::NoEntry) => Ok(false),
    Err(e) => Err(e.to_string()),
  }
}

#[tauri::command]
pub fn clear_github_token() -> Result<(), String> {
  match token_entry()?.delete_credential() {
    Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
    Err(e) => Err(e.to_string()),
  }
}

fn get_token() -> Result<String, String> {
  token_entry()?.get_password().map_err(|e| match e {
    keyring::Error::NoEntry => "No GitHub token saved yet - add one in Settings.".to_string(),
    other => other.to_string(),
  })
}

fn client() -> Result<reqwest::Client, String> {
  reqwest::Client::builder()
    .user_agent("Prox")
    .build()
    .map_err(|e| e.to_string())
}

async fn github_response(resp: reqwest::Response) -> Result<serde_json::Value, String> {
  let status = resp.status();
  let text = resp.text().await.map_err(|e| e.to_string())?;
  let value: serde_json::Value = if text.trim().is_empty() {
    serde_json::Value::Null
  } else {
    serde_json::from_str(&text).map_err(|e| format!("{e}: {text}"))?
  };
  if status.is_success() {
    Ok(value)
  } else {
    let message = value
      .get("message")
      .and_then(|m| m.as_str())
      .map(str::to_string)
      .unwrap_or(text);
    Err(format!("GitHub API error ({status}): {message}"))
  }
}

async fn github_get(
  client: &reqwest::Client,
  token: &str,
  path: &str,
) -> Result<serde_json::Value, String> {
  let resp = client
    .get(format!("https://api.github.com{path}"))
    .bearer_auth(token)
    .header("Accept", "application/vnd.github+json")
    .header("X-GitHub-Api-Version", "2022-11-28")
    .send()
    .await
    .map_err(|e| e.to_string())?;
  github_response(resp).await
}

async fn github_send(
  client: &reqwest::Client,
  token: &str,
  method: reqwest::Method,
  path: &str,
  body: &serde_json::Value,
) -> Result<serde_json::Value, String> {
  let resp = client
    .request(method, format!("https://api.github.com{path}"))
    .bearer_auth(token)
    .header("Accept", "application/vnd.github+json")
    .header("X-GitHub-Api-Version", "2022-11-28")
    .json(body)
    .send()
    .await
    .map_err(|e| e.to_string())?;
  github_response(resp).await
}

/// A file to commit, already base64-encoded (the GitHub Contents API's own
/// requirement) - the frontend encodes text MDX the same way it encodes
/// binary image blobs, so this command has one path, not two.
#[derive(Deserialize)]
pub struct PublishFile {
  pub path: String,
  pub content_base64: String,
}

#[derive(Deserialize)]
pub struct PublishRequest {
  pub branch: String,
  #[serde(default = "default_base")]
  pub base: String,
  pub pr_title: String,
  pub pr_body: String,
  pub files: Vec<PublishFile>,
  #[serde(default)]
  pub labels: Vec<String>,
}

fn default_base() -> String {
  "main".to_string()
}

#[derive(Serialize)]
pub struct PublishResult {
  pub pr_number: u64,
  pub pr_url: String,
  pub branch: String,
}

/// Creates a branch off `base`, commits every file to it (updating in place
/// if a file - typically a series' index.md - already exists there), opens
/// a PR, and best-effort applies any requested labels (e.g. deploy-preview
/// for Blog's Firebase Hosting preview channel).
#[tauri::command]
pub async fn publish_to_blog(request: PublishRequest) -> Result<PublishResult, String> {
  let token = get_token()?;
  let client = client()?;

  let base_ref = github_get(
    &client,
    &token,
    &format!("/repos/{OWNER}/{REPO}/git/ref/heads/{}", request.base),
  )
  .await?;
  let base_sha = base_ref["object"]["sha"]
    .as_str()
    .ok_or_else(|| "Could not resolve the base branch's sha".to_string())?
    .to_string();

  let create_branch = github_send(
    &client,
    &token,
    reqwest::Method::POST,
    &format!("/repos/{OWNER}/{REPO}/git/refs"),
    &serde_json::json!({ "ref": format!("refs/heads/{}", request.branch), "sha": base_sha }),
  )
  .await;
  if let Err(message) = &create_branch {
    // Retrying a publish whose branch already exists (e.g. after fixing
    // a file and re-running) should carry on, not fail.
    if !message.contains("Reference already exists") {
      return Err(message.clone());
    }
  }

  for file in &request.files {
    let encoded_path = encode_path(&file.path);
    let existing = github_get(
      &client,
      &token,
      &format!(
        "/repos/{OWNER}/{REPO}/contents/{encoded_path}?ref={}",
        request.branch
      ),
    )
    .await;
    let mut body = serde_json::json!({
        "message": format!("Publish via Prox: {}", file.path),
        "content": file.content_base64,
        "branch": request.branch,
    });
    if let Ok(existing) = existing
      && let Some(sha) = existing.get("sha").and_then(|s| s.as_str())
    {
      body["sha"] = serde_json::Value::String(sha.to_string());
    }
    github_send(
      &client,
      &token,
      reqwest::Method::PUT,
      &format!("/repos/{OWNER}/{REPO}/contents/{encoded_path}"),
      &body,
    )
    .await?;
  }

  let pr = github_send(
    &client,
    &token,
    reqwest::Method::POST,
    &format!("/repos/{OWNER}/{REPO}/pulls"),
    &serde_json::json!({
        "title": request.pr_title,
        "head": request.branch,
        "base": request.base,
        "body": request.pr_body,
    }),
  )
  .await?;
  let pr_number = pr["number"]
    .as_u64()
    .ok_or_else(|| "GitHub did not return a PR number".to_string())?;
  let pr_url = pr["html_url"].as_str().unwrap_or_default().to_string();

  if !request.labels.is_empty() {
    let _ = github_send(
      &client,
      &token,
      reqwest::Method::POST,
      &format!("/repos/{OWNER}/{REPO}/issues/{pr_number}/labels"),
      &serde_json::json!({ "labels": request.labels }),
    )
    .await;
  }

  Ok(PublishResult {
    pr_number,
    pr_url,
    branch: request.branch,
  })
}

#[derive(Serialize)]
pub struct PrStatus {
  pub state: String,
  pub merged: bool,
  pub html_url: String,
  pub mergeable: Option<bool>,
}

/// Polled from the Published stage - there is no public endpoint a desktop
/// app can receive a webhook on, so merge detection is pull-based.
#[tauri::command]
pub async fn get_pr_status(pr_number: u64) -> Result<PrStatus, String> {
  let token = get_token()?;
  let client = client()?;
  let pr = github_get(
    &client,
    &token,
    &format!("/repos/{OWNER}/{REPO}/pulls/{pr_number}"),
  )
  .await?;
  Ok(PrStatus {
    state: pr["state"].as_str().unwrap_or("open").to_string(),
    merged: pr["merged"].as_bool().unwrap_or(false),
    html_url: pr["html_url"].as_str().unwrap_or_default().to_string(),
    mergeable: pr["mergeable"].as_bool(),
  })
}
