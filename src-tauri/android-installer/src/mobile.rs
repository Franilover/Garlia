use serde::{Deserialize, Serialize};
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

/// Args que le pasamos al lado Kotlin — tienen que ser Serialize (van hacia
/// afuera), no Deserialize como estaba antes.
#[derive(Serialize)]
pub struct InstallApkArgs {
    pub path: String,
}

pub fn init<R: Runtime, C: serde::de::DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<AndroidInstaller<R>> {
    let handle = api.register_android_plugin("com.frani.garlia.installer", "InstallerPlugin")?;
    Ok(AndroidInstaller(handle))
}

pub struct AndroidInstaller<R: Runtime>(PluginHandle<R>);

/// Respuesta que devuelve el lado Kotlin al resolver `invoke.resolve()` sin
/// argumentos — tiene que ser Deserialize (viene desde afuera), no Serialize.
#[derive(Deserialize)]
struct EmptyResponse {}

impl<R: Runtime> AndroidInstaller<R> {
    pub fn install_apk(&self, path: String) -> crate::Result<()> {
        self.0
            .run_mobile_plugin::<EmptyResponse>("installApk", InstallApkArgs { path })?;
        Ok(())
    }
}
