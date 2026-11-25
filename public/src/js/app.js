if ('serviceWorker' in navigator) {
    // Si ya había un service worker, un cambio de controlador significa
    // que se instaló una versión nueva: recargar una vez para usarla.
    var hadController = !!navigator.serviceWorker.controller;
    var reloading = false;

    navigator.serviceWorker.addEventListener('controllerchange', function() {
        if (!hadController || reloading) {
            return;
        }

        reloading = true;
        window.location.reload();
    });

    navigator.serviceWorker.register('/sw.js')
        .then(function() {
            console.log('Service Worker Registered');
        });
}
