mod github;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      github::set_github_token,
      github::has_github_token,
      github::clear_github_token,
      github::publish_to_blog,
      github::get_pr_status,
    ])
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
