function $(id){ return document.getElementById(id); }

function load() {
  chrome.storage.sync.get({
    addressId: '',
    cardId: '',
    addressName: '',
    addressFragment: '',
    cardLast4: '',
    cardNickname: '',
    autoOn: true,
    delayMs: 500
  }, (opts) => {
    $('addressId').value = opts.addressId;
    $('cardId').value = opts.cardId;
    $('addressName').value = opts.addressName;
    $('addressFragment').value = opts.addressFragment;
    $('cardLast4').value = opts.cardLast4;
    $('cardNickname').value = opts.cardNickname;
    $('autoOn').checked = opts.autoOn;
    $('delayMs').value = opts.delayMs;
  });
}

function save() {
  const data = {
    addressId: $('addressId').value.trim(),
    cardId: $('cardId').value.trim(),
    addressName: $('addressName').value.trim(),
    addressFragment: $('addressFragment').value.trim(),
    cardLast4: $('cardLast4').value.trim(),
    cardNickname: $('cardNickname').value.trim(),
    autoOn: $('autoOn').checked,
    delayMs: Math.max(100, parseInt($('delayMs').value || '500', 10))
  };
  chrome.storage.sync.set(data, () => {
    const s = document.getElementById('status');
    s.textContent = 'Saved';
    s.className = 'ok';
    setTimeout(() => { s.textContent = ''; s.className = ''; }, 1200);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  load();
  document.getElementById('save').addEventListener('click', save);
});
