use tauri::{http, UriSchemeContext, Runtime};

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
pub fn handle<R: Runtime>(
    ctx: UriSchemeContext<'_, R>,
    request: http::Request<Vec<u8>>,
) -> http::Response<std::borrow::Cow<'static, [u8]>> {
    let app = ctx.app_handle();
    let original_path = request.uri().path();
    let rewritten_path = rewrite_path(original_path);

    // DEBUG TEMPORAL: confirmar si el WebView está pegándole al protocolo
    // custom en absoluto, y qué path llega. Buscar "GARLIA_PROTO" en logcat.
    eprintln!(
        "GARLIA_PROTO uri_completa={} path_original={} path_reescrito={}",
        request.uri(),
        original_path,
        rewritten_path
    );

    match app.asset_resolver().get(rewritten_path.clone()) {
        Some(asset) => {
            eprintln!("GARLIA_PROTO HIT path={} bytes={}", rewritten_path, asset.bytes.len());
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
            http::Response::builder()
                .status(http::StatusCode::NOT_FOUND)
                .header(http::header::CONTENT_TYPE, "text/plain")
                .body(std::borrow::Cow::Borrowed(
                    b"asset no encontrado" as &[u8]
                ))
                .unwrap()
        }
    }
}
