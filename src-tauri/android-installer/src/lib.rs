use serde::Serialize;
use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

#[cfg(target_os = "android")]
mod mobile;
#[cfg(target_os = "android")]
use mobile::AndroidInstaller;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Tauri(#[from] tauri::Error),
    #[cfg(target_os = "android")]
    #[error(transparent)]
    PluginInvoke(#[from] tauri::plugin::mobile::PluginInvokeError),
    #[error("instalación de APK solo soportada en Android")]
    NoSoportado,
}

// El trait Serialize exige que serialize() devuelva Result<S::Ok, S::Error>
// (el error del propio Serializer, no el nuestro) — por eso acá usamos
// std::result::Result explícito en vez del alias `Result<T>` de más abajo,
// que solo tiene un genérico y no aplica a esta firma.
impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

pub type Result<T> = std::result::Result<T, Error>;

/// Dispara el Intent nativo de instalación (ACTION_VIEW + FileProvider) para
/// el APK en `path`. En Android esto abre la pantalla del sistema donde el
/// usuario tiene que tocar "Instalar" — no hay forma de saltarse ese paso.
#[tauri::command]
async fn install_apk<R: Runtime>(
    app: tauri::AppHandle<R>,
    path: String,
) -> Result<()> {
    #[cfg(target_os = "android")]
    {
        app.state::<AndroidInstaller<R>>().install_apk(path)?;
        Ok(())
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, path);
        Err(Error::NoSoportado)
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("android-installer")
        .invoke_handler(tauri::generate_handler![install_apk])
        .setup(|app, api| {
            #[cfg(target_os = "android")]
            {
                let installer = mobile::init(app, api)?;
                app.manage(installer);
            }
            #[cfg(not(target_os = "android"))]
            {
                let _ = api;
            }
            Ok(())
        })
        .build()
}
