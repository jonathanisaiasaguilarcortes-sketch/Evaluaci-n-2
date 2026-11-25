
var shareImageButton = document.querySelector('#share-image-button');
var createPostArea = document.querySelector('#create-post');
var closeCreatePostModalButton = document.querySelector('#close-create-post-modal-btn');
var sharedMomentsArea = document.querySelector('#shared-moments');
var form = document.querySelector('form');
var titleInput = document.querySelector('#title');
var locationInput = document.querySelector('#location');

function openCreatePostModal() {
  createPostArea.style.display = 'block';

  requestAnimationFrame(function() {
    createPostArea.style.transform = 'translateY(0)';
  });
}
function closeCreatePostModal() {
  //createPostArea.style.display = 'none';
  createPostArea.style.transform = 'translateY(100vh)';
}

shareImageButton.addEventListener('click', openCreatePostModal);
closeCreatePostModalButton.addEventListener('click', closeCreatePostModal);

function clearCards(){
  while(sharedMomentsArea.hasChildNodes()) {
    sharedMomentsArea.removeChild(sharedMomentsArea.lastChild);
  }
}

function createCard(data) {
  var cardWrapper = document.createElement('div');
  cardWrapper.className = 'shared-moment-card mdl-card mdl-shadow--2dp';

  var cardTitle = document.createElement('div');
  cardTitle.className = 'mdl-card__title';
  cardTitle.style.backgroundImage = 'url(' + data.image + ')';
  cardTitle.style.backgroundSize = 'cover';
  cardTitle.style.height = '180px';
  cardWrapper.appendChild(cardTitle);

  var cardTitleTextElement = document.createElement('h2');
  cardTitleTextElement.style.color = 'white';
  cardTitleTextElement.className = 'mdl-card__title-text';
  cardTitleTextElement.textContent = data.title;
  cardTitle.appendChild(cardTitleTextElement);

  var cardSupportingText = document.createElement('div');
  cardSupportingText.className = 'mdl-card__supporting-text';
  cardSupportingText.textContent = data.location;
  cardSupportingText.style.textAlign = 'center';
  cardWrapper.appendChild(cardSupportingText);

  componentHandler.upgradeElement(cardWrapper);
  sharedMomentsArea.appendChild(cardWrapper);
}

function updateUI(data) {
  clearCards();

  for (var i = 0; i < data.length; i++) {
    createCard(data[i]);
  }
}

var url = 'https://uteq-test-e1406-default-rtdb.firebaseio.com/post.json';
var networkDataReceived = false;

function loadPosts() {
  return fetch(url)
    .then(function(res) {
      if (!res.ok) {
        throw new Error('Error al consultar publicaciones: ' + res.status);
      }

      return res.json();
    })
    .then(function(data) {
      networkDataReceived = true;
      console.log('From web', data);

      var dataArray = [];

      for (var key in data) {
        dataArray.push(data[key]);
      }

      updateUI(dataArray);
    })
    .catch(function(err) {
      console.log('Sin acceso a la red. Se usarán los datos locales.', err);
    });
}

loadPosts();

// El service worker avisa cuando terminó de enviar las publicaciones pendientes.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'posts-synced') {
      console.log('Publicaciones sincronizadas, actualizando el feed');
      loadPosts();
    }
  });
}

// Al recuperar la conexión, volver a cargar las publicaciones.
window.addEventListener('online', function() {
  loadPosts();
});

if ('indexedDB' in window) {
  readAllData('posts')
    .then(function(data) {
      if (!networkDataReceived) {
        console.log('From cache', data);
        updateUI(data);
      }
    })
    .catch(function(err) {
      console.log('Error al leer los datos locales:', err);
    });
}


var IMAGE_URL = 'https://firebasestorage.googleapis.com/v0/b/uteq-test-e1406.firebasestorage.app/o/sf-boat.png?alt=media&token=d1007737-4ad7-45af-af09-619e694a8452';
var hasBackgroundSync = 'serviceWorker' in navigator && 'SyncManager' in window;
var sendingPending = false;

// Para navegadores sin Background Sync (iPhone): la propia página envía
// las publicaciones pendientes guardadas en IndexedDB.
function sendPendingPosts() {
  if (sendingPending || !navigator.onLine) {
    return Promise.resolve();
  }

  sendingPending = true;

  return readAllData('sync-posts')
    .then(function(posts) {
      if (!posts.length) {
        return false;
      }

      return Promise.all(
        posts.map(function(post) {
          return fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              id: post.id,
              title: post.title,
              location: post.location,
              image: IMAGE_URL
            })
          })
            .then(function(res) {
              if (!res.ok) {
                throw new Error('Error al enviar: ' + res.status);
              }

              return deleteItemFromData('sync-posts', post.id);
            });
        })
      ).then(function() {
        return true;
      });
    })
    .then(function(sentSomething) {
      if (sentSomething) {
        console.log('Publicaciones pendientes enviadas');
        return loadPosts();
      }
    })
    .catch(function(err) {
      console.log('No se pudieron enviar las publicaciones pendientes:', err);
    })
    .then(function() {
      sendingPending = false;
    });
}

function showToast(message) {
  var snackbarContainer = document.querySelector('#confirmation-toast');

  if (snackbarContainer && snackbarContainer.MaterialSnackbar) {
    snackbarContainer.MaterialSnackbar.showSnackbar({ message: message });
  }
}

form.addEventListener('submit', function(event) {
  event.preventDefault();

  if (titleInput.value.trim() === '' || locationInput.value.trim() === '') {
    alert('Please enter valid data!');
    return;
  }

  closeCreatePostModal();

  var post = {
    id: new Date().toISOString(),
    title: titleInput.value,
    location: locationInput.value,
    image: IMAGE_URL
  };

  // Guardar primero en IndexedDB para no perderla si no hay internet.
  writeData('sync-posts', post)
    .then(function() {
      // Mostrar la publicación de inmediato, sin esperar a que se envíe.
      createCard(post);
      form.reset();

      if (hasBackgroundSync) {
        return navigator.serviceWorker.ready
          .then(function(sw) {
            return sw.sync.register('sync-new-posts');
          })
          .then(function() {
            showToast('Your Post was saved for syncing!');
          });
      }

      showToast(navigator.onLine ? 'Enviando publicación...' : 'Sin conexión: se enviará al volver el internet');
      return sendPendingPosts();
    })
    .catch(function(err) {
      console.log(err);
    });
});

// iPhone no recarga la app de la pantalla principal al volver a abrirla:
// actualizar el feed (y enviar pendientes) cada vez que vuelve a estar visible.
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState !== 'visible') {
    return;
  }

  loadPosts();

  if (!hasBackgroundSync) {
    sendPendingPosts();
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then(function(reg) {
      if (reg) {
        reg.update();
      }
    });
  }
});

if (!hasBackgroundSync) {
  window.addEventListener('online', sendPendingPosts);
  sendPendingPosts();
}
