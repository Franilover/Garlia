use serde::{Deserialize, Serialize};
use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

#[cfg(target_os = "android")]
mod mobile;
#[cfg(target_os = "android")]
use mobile::AndroidInstaller;

#[derive(Debug, Deserialize)]
pub struct InstallApkArgs {
    /// Ruta absoluta al .apk ya descargado en almacenamiento de la app
    /// (ej. el que devuelve tauri-plugin-fs / app.path().app_data_dir()).
    pub path: String,
}

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

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

type Result<T> = std::result::Result<T, Error>;

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
