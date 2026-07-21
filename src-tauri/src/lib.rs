#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // reqwest 0.13 (usado internamente por Tauri / sus plugins) requiere que
  // se instale explícitamente un crypto provider de rustls antes de crear
  // cualquier cliente HTTP, o crashea con SIGABRT apenas se intenta hacer
  // la primera petición de red (ver panic en reqwest async_impl/client.rs).
  // Esto se instala una sola vez, apenas arranca la app.
  rustls::crypto::aws_lc_rs::default_provider()
    .install_default()
    .expect("no se pudo instalar el crypto provider de rustls");

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
    .run(tauri::generate_context!())
    .expect("error while running tauri application")
}
