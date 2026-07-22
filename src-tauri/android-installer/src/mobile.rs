use serde::{Deserialize, Serialize};
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::InstallApkArgs;

tauri::plugin::mobile::declare_plugin!(
    "com.frani.garlia.installer",
    "InstallerPlugin"
);

pub fn init<R: Runtime, C: serde::de::DeserializeOwned>(
    app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<AndroidInstaller<R>> {
    let handle = api.register_android_plugin("com.frani.garlia.installer", "InstallerPlugin")?;
    Ok(AndroidInstaller(handle))
}

pub struct AndroidInstaller<R: Runtime>(PluginHandle<R>);

#[derive(Serialize)]
struct EmptyResponse {}

impl<R: Runtime> AndroidInstaller<R> {
    pub fn install_apk(&self, path: String) -> crate::Result<()> {
        self.0
            .run_mobile_plugin::<EmptyResponse>("installApk", InstallApkArgs { path })?;
        Ok(())
    }
}
