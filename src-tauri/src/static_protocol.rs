use percent_encoding::percent_decode_str;
use tauri::{http, Runtime, UriSchemeContext};

use crate::static_rewrite::rewrite_path;

/// Maneja las requests del protocolo custom `garlia://`.
///
/// Es el reemplazo, en producción, del protocolo `asset`/`tauri` por
/// defecto: hace exactamente lo mismo (servir los archivos de
/// `frontendDist`, vía `AssetResolver`, que ya sabe resolver `foo` ->
/// `foo.html` -> `foo/index.html` -> `index.html`), pero antes de resolver
/// aplica los mismos rewrites que `vercel.json` usa en la web para que las
/// rutas dinámicas ([id], [username], etc.) funcionen igual que en el
/// navegador. Ver `static_rewrite.rs`.
///
/// IMPORTANTE: el path del URI llega percent-encoded (`Mi%20dibujo.png`,
/// `dise%C3%B1o.jpg`). El `AssetResolver` indexa por nombre real de
/// archivo, así que hay que decodificar antes de buscar. El protocolo por
/// defecto de Tauri lo hace; este handler custom no lo hacía.
fn not_found() -> http::Response<std::borrow::Cow<'static, [u8]>> {
    http::Response::builder()
        .status(http::StatusCode::NOT_FOUND)
        .header(http::header::CONTENT_TYPE, "text/plain")
        .body(std::borrow::Cow::Borrowed(b"asset no encontrado" as &[u8]))
        .unwrap()
}

pub fn handle<R: Runtime>(
    ctx: UriSchemeContext<'_, R>,
    request: http::Request<Vec<u8>>,
) -> http::Response<std::borrow::Cow<'static, [u8]>> {
    let app = ctx.app_handle();
    let original_path = request.uri().path();
    let decoded_path = percent_decode_str(original_path)
        .decode_utf8_lossy()
        .to_string();
    let rewritten_path = rewrite_path(&decoded_path);

    // DEBUG TEMPORAL: buscar "GARLIA_PROTO" en logcat.
    eprintln!(
        "GARLIA_PROTO uri_completa={} path_original={} path_decodificado={} path_reescrito={}",
        request.uri(),
        original_path,
        decoded_path,
        rewritten_path
    );

    match app.asset_resolver().get(rewritten_path.clone()) {
        Some(asset) => {
            // `AssetResolver::get` cae a index.html cuando no encuentra el
            // archivo. Si se pidió algo con extensión (imagen, js, css...)
            // y volvió HTML, en realidad es un archivo inexistente: mejor
            // un 404 explícito que un <img> recibiendo HTML.
            let pide_archivo = rewritten_path
                .rsplit('/')
                .next()
                .map(|s| s.contains('.') && !s.ends_with(".html"))
                .unwrap_or(false);

            if pide_archivo && asset.mime_type.starts_with("text/html") {
                eprintln!("GARLIA_PROTO FALLBACK_HTML path={}", rewritten_path);
                return not_found();
            }

            eprintln!(
                "GARLIA_PROTO HIT path={} mime={} bytes={}",
                rewritten_path,
                asset.mime_type,
                asset.bytes.len()
            );
            let mut builder = http::Response::builder()
                .status(http::StatusCode::OK)
                .header(http::header::CONTENT_TYPE, asset.mime_type);

            if let Some(csp) = asset.csp_header {
                builder = builder.header("Content-Security-Policy", csp);
            }

            builder
                .body(std::borrow::Cow::Owned(asset.bytes))
                .unwrap()
        }
        None => {
            eprintln!("GARLIA_PROTO MISS path={}", rewritten_path);
            not_found()
        }
    }
}
