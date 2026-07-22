package com.frani.garlia.installer

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.Plugin
import java.io.File

@InvokeArg
class InstallApkArgs {
    lateinit var path: String
}

/**
 * InstallerPlugin
 * ─────────────────────────────────────────────────────────────────────────
 * Único trabajo: dado un .apk ya descargado a disco por el lado JS/Rust
 * (ver ActualizacionDisponible.tsx), abrir la pantalla nativa de Android
 * para instalarlo. Android NO permite auto-instalación silenciosa fuera
 * de Play Store — el usuario siempre tiene que tocar "Instalar" a mano
 * en la pantalla del sistema que dispara este Intent.
 *
 * Requiere:
 *  - permiso REQUEST_INSTALL_PACKAGES en el AndroidManifest.xml
 *  - un <provider> FileProvider declarado (ver file_paths.xml al lado)
 * ─────────────────────────────────────────────────────────────────────────
 */
@TauriPlugin
class InstallerPlugin(private val activity: Activity) : Plugin(activity) {

    @Command
    fun installApk(invoke: Invoke) {
        val args = invoke.parseArgs(InstallApkArgs::class.java)
        val apkFile = File(args.path)

        if (!apkFile.exists()) {
            invoke.reject("El archivo APK no existe en la ruta indicada: ${args.path}")
            return
        }

        // Android 8+ exige permiso explícito de "instalar apps desconocidas"
        // para este origen. Si no lo tiene, lo mandamos a la pantalla de
        // ajustes correspondiente en vez de fallar en silencio.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            !activity.packageManager.canRequestPackageInstalls()
        ) {
            val settingsIntent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                data = Uri.parse("package:${activity.packageName}")
            }
            activity.startActivity(settingsIntent)
            invoke.reject(
                "Falta el permiso 'instalar apps desconocidas'. Se abrió la pantalla de " +
                    "ajustes: activalo y volvé a tocar 'Actualizar'."
            )
            return
        }

        try {
            val apkUri: Uri = FileProvider.getUriForFile(
                activity,
                "${activity.packageName}.fileprovider",
                apkFile
            )

            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            activity.startActivity(installIntent)
            invoke.resolve()
        } catch (e: Exception) {
            invoke.reject("No se pudo abrir el instalador: ${e.message}")
        }
    }
}
