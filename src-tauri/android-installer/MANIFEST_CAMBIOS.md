# Cambios de AndroidManifest.xml — aplicar DESPUÉS de `tauri android init`

Tu proyecto todavía no tiene `src-tauri/gen/android/` (se genera con
`npx tauri android init`, o `cargo tauri android init`). Una vez que lo
corras, vas a tener `src-tauri/gen/android/app/src/main/AndroidManifest.xml`.
Ahí hay que agregar esto a mano (Tauri no lo hace solo):

## 1. Permiso para instalar APKs

Dentro de `<manifest>`, junto a los demás `<uses-permission>`:

```xml
<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
```

## 2. FileProvider

Dentro de `<application>`, junto a los demás `<provider>` (o si no hay
ninguno, agregalo directo):

```xml
<provider
    android:name="androidx.core.content.FileProvider"
    android:authorities="${applicationId}.fileprovider"
    android:exported="false"
    android:grantUriPermissions="true">
    <meta-data
        android:name="android.support.FILE_PROVIDER_PATHS"
        android:resource="@xml/file_paths" />
</provider>
```

`file_paths.xml` ya está en este plugin
(`android/src/main/res/xml/file_paths.xml`) y se copia solo al proyecto
`gen/android` al compilar, porque el plugin declara `android_path("android")`
en su `build.rs` — no hace falta copiarlo a mano.

## 3. Registrar el módulo del plugin en settings.gradle.kts

En `src-tauri/gen/android/settings.gradle.kts`, agregar (si Tauri no lo
detecta solo vía el `Cargo.toml` — revisar después del primer build):

```kotlin
include(":android-installer")
project(":android-installer").projectDir =
    File("../../android-installer/android")
```

## 4. Verificación rápida

Después de aplicar esto y compilar (`npx tauri android build` o `dev`),
confirmá que:
- El manifest final (`app/build/intermediates/merged_manifest/...`) tiene
  el permiso y el `<provider>` mergeados.
- `canRequestPackageInstalls()` — la primera vez el sistema va a pedir
  el permiso "instalar apps desconocidas" para Garlia; el plugin ya
  redirige solo a esa pantalla si falta (ver `InstallerPlugin.kt`).
