function openDb() {
  var promise = idb.open('posts-store', 1, function (db) {
    if (!db.objectStoreNames.contains('posts')) {
      db.createObjectStore('posts', { keyPath: 'id' });
    }

    if (!db.objectStoreNames.contains('sync-posts')) {
      db.createObjectStore('sync-posts', { keyPath: 'id' });
    }
  });

  promise.then(function (db) {
    // Si el navegador cierra la conexión (p. ej. al borrar los datos del sitio),
    // abrir una nueva en la siguiente operación.
    db._db.onclose = function () {
      dbPromise = openDb();
    };
    db._db.onversionchange = function () {
      db.close();
      dbPromise = openDb();
    };
  }).catch(function () {});

  return promise;
}

var dbPromise = openDb();

// Ejecuta una operación y, si la conexión estaba cerrada, reconecta y reintenta una vez.
function withDb(operation) {
  return dbPromise
    .then(operation)
    .catch(function (err) {
      if (err && err.name === 'InvalidStateError') {
        dbPromise = openDb();
        return dbPromise.then(operation);
      }
      throw err;
    });
}

function writeData(st, data) {
  return withDb(function (db) {
    var tx = db.transaction(st, 'readwrite');
    var store = tx.objectStore(st);
    store.put(data);
    return tx.complete;
  });
}

function readAllData(st) {
  return withDb(function (db) {
    var tx = db.transaction(st, 'readonly');
    var store = tx.objectStore(st);
    return store.getAll();
  });
}

function clearAllData(st) {
  return withDb(function (db) {
    var tx = db.transaction(st, 'readwrite');
    var store = tx.objectStore(st);
    store.clear();
    return tx.complete;
  });
}

function deleteItemFromData(st, id) {
  return withDb(function (db) {
    var tx = db.transaction(st, 'readwrite');
    var store = tx.objectStore(st);
    store.delete(id);
    return tx.complete;
  })
    .then(function () {
      console.log('Item deleted!');
    });
}
