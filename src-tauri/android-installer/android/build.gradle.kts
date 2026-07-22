plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.frani.garlia.installer"
    compileSdk = 34

    defaultConfig {
        minSdk = 24
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }

    kotlinOptions {
        jvmTarget = "1.8"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    // Provee las anotaciones @TauriPlugin/@Command y las clases base Plugin/Invoke.
    // Tauri lo agrega automáticamente al proyecto gen/android al correr `tauri android init`;
    // si el módulo no resuelve el import, agregar la dependencia local al app/tauri-android aquí.
    compileOnly(project(":tauri-android"))
}
