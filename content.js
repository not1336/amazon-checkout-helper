const DEBUG = true;
const COOLDOWN_MS = 1200;
const log = (...a)=>DEBUG&&console.log("[ACH]",...a);
const wait = (ms)=>new Promise(r=>setTimeout(r,ms));

function getPurchaseId(){
  const m = location.pathname.match(/\/checkout\/p\/([^/]+)/);
  return m ? m[1] : null;
}
function getState(pid){
  try { return JSON.parse(sessionStorage.getItem("ach:"+pid)||"{}"); }
  catch { return {}; }
}
function setState(pid, patch){
  const cur = getState(pid);
  const next = { didAddress:false, didPay:false, done:false, lastNav:0, ...cur, ...patch };
  sessionStorage.setItem("ach:"+pid, JSON.stringify(next));
  return next;
}
function canNav(pid){
  const { lastNav=0 } = getState(pid);
  return Date.now() - lastNav > COOLDOWN_MS;
}
function markNav(pid){ setState(pid, { lastNav: Date.now() }); }

function buildAddressUrl(pid, addressId){
  const p = new URLSearchParams({ pipelineType:"Chewbacca", addressID:addressId, action:"select-shipping", encoding:"UTF8" });
  return `/checkout/p/${pid}/address/shiptodestination?${p.toString()}`; // GET is OK here
}
function buildPayPage(pid){
  const p = new URLSearchParams({ pipelineType:"Chewbacca", referrer:"address" });
  return `/checkout/p/${pid}/pay?${p.toString()}`; // only /pay (NOT /pay/continue)
}
function backToSpcUrl(pid){
  const p = new URLSearchParams({ pipelineType: "Chewbacca", referrer: "pay" });
  return `/checkout/p/${pid}/spc?${p.toString()}`;
}

async function getPrefs(){
  return new Promise(r=>{
    chrome.storage.sync.get({
      autoOn:true,
      addressId:"",          // e.g. 433XCBN...
      addressName:"",
      addressFragment:"",
      cardId:"",             // instrumentId
      cardLast4:"",
      cardNickname:"",
      delayMs:500
    }, r);
  });
}

// -------- visibility checks
function pageShowsAddress(addressId, addressName, addressFragment) {
  if (!document.body) return false;
  const text = document.body.innerText.toLowerCase();
  if (addressId && text.includes(addressId.toLowerCase())) return true;
  if (addressName && text.includes(addressName.toLowerCase())) return true;
  if (addressFragment && text.includes(addressFragment.toLowerCase())) return true;
  return false;
}
function payHasSelectedCard(instrId, last4, nickname){
  // Prefer explicit checked radio
  const checked = document.querySelector('input[name="ppw-instrumentRowSelection"]:checked');
  if (checked && instrId && checked.value.toLowerCase().includes(instrId.toLowerCase())) return true;

  // Text fallback (works even when radios not checked yet but selected appears elsewhere)
  const text = (document.body?.innerText || "").toLowerCase();
  if (instrId && text.includes(instrId.toLowerCase())) return true;
  if (last4 && text.includes(String(last4).toLowerCase())) return true;
  if (nickname && text.includes(nickname.toLowerCase())) return true;
  return false;
}

async function autoFlow(){
  const pid = getPurchaseId();
  if (!pid) return;
  const prefs = await getPrefs();
  if (!prefs.autoOn) return;

  const state = getState(pid);
  const path = location.pathname;
  log("flow", { pid, path, state });

  if (state.done) return;

  // Upfront validation — mark complete if already active
  if ((prefs.addressId || prefs.addressName || prefs.addressFragment) && !state.didAddress) {
    if (pageShowsAddress(prefs.addressId, prefs.addressName, prefs.addressFragment)) {
      log("Address already active; marking didAddress");
      setState(pid, { didAddress:true });
    }
  }
  if ((prefs.cardId || prefs.cardLast4 || prefs.cardNickname) && !state.didPay) {
    if (payHasSelectedCard(prefs.cardId, prefs.cardLast4, prefs.cardNickname)) {
      log("Card already active; marking didPay");
      setState(pid, { didPay:true });
    }
  }

  // Treat these as terminals of the Pay POST; never redirect from them.
  if (/\/checkout\/p\/[^/]+\/pay\/(continue|selectinstrument)/.test(path)){
    log("pay terminal reached; marking didPay");
    setState(pid, { didPay:true });
    if (getState(pid).didAddress) setState(pid, { done:true });
    return;
  }

  // SUMMARY (/spc)
  if (path.includes("/spc")){
    // If both steps done, chill
    const s = getState(pid);
    if ((s.didAddress || !prefs.addressId) && s.didPay) {
      setState(pid, { done:true });
      log("Both steps done; resting on /spc");
      return;
    }

    // Need address?
    if (prefs.addressId && !s.didAddress){
      if (!canNav(pid)) return;
      const url = buildAddressUrl(pid, prefs.addressId);
      setState(pid, { didAddress:true }); // mark before nav to prevent loops
      markNav(pid);
      log("-> address", url);
      location.href = url;
      return;
    }

    // Need payment? Go to pay page once
    if (!s.didPay){
      if (!canNav(pid)) return;
      const pay = buildPayPage(pid);
      markNav(pid);
      log("-> pay", pay);
      location.href = pay;
      return;
    }

    return;
  }

  // ADDRESS PAGE: after GET, hop to /pay once
  if (path.includes("/address")){
    if (!state.didAddress) setState(pid, { didAddress:true });
    if (!state.didPay){
      if (!canNav(pid)) return;
      const pay = buildPayPage(pid);
      markNav(pid);
      log("address -> pay", pay);
      location.href = pay;
    }
    return;
  }

  // PAY PAGE: select radio -> submit form -> fallback redirect to /spc once
  if (path.includes("/pay")) {
    if (state.didPay) { log("Pay already handled; skipping"); return; }

    await wait(prefs.delayMs);
  
    // 1) Find the target radio (prefer instrumentId; fallback last4/nickname)
    let radio = null;
    if (prefs.cardId) {
      radio = document.querySelector(
        `input[name="ppw-instrumentRowSelection"][value*="instrumentId=${prefs.cardId}"]`
      );
    }
    if (!radio && (prefs.cardLast4 || prefs.cardNickname)) {
      const radios = Array.from(document.querySelectorAll('input[name="ppw-instrumentRowSelection"]'));
      radio = radios.find(r => {
        const txt = (r.closest('label')?.textContent || '').toLowerCase();
        return (prefs.cardLast4 && txt.includes(prefs.cardLast4)) ||
               (prefs.cardNickname && txt.includes(prefs.cardNickname.toLowerCase()));
      }) || null;
    }
  
    if (!radio) { log("No matching card found; not submitting"); return; }
  
    // 2) Select it (fire change so Amazon records it)
    const label = document.querySelector(`label[for="${radio.id}"]`) || radio.closest('label');
    label ? label.click() : (radio.checked = true, radio.dispatchEvent(new Event("change", { bubbles:true })));
    log("Selected card radio");
  
    // 3) Submit the enclosing form (POST to /pay/continue under the hood)
    const form = radio.closest("form") || document.querySelector("form.pmts-select-payment-instrument-form");
    if (!form) { log("Payment form not found; aborting"); return; }
  
    // Mark state BEFORE submitting to prevent loops if we bounce quickly
    setState(pid, { didPay: true });
    markNav(pid);
  
    // Preferred: requestSubmit (fires proper submit with validation/listeners)
    try {
      if (typeof form.requestSubmit === "function") {
        log("Submitting pay form via requestSubmit()");
        form.requestSubmit();
      } else {
        log("Submitting pay form via submit()");
        form.submit();
      }
    } catch (e) {
      log("Form submit threw:", e);
    }
  
    // 4) Fallback: if we’re STILL on /pay after a short grace, hop to /spc once
    const spcUrl = `/checkout/p/${pid}/spc?pipelineType=Chewbacca&referrer=pay`;
    setTimeout(() => {
      if (location.pathname.includes("/pay") && canNav(pid)) {
        markNav(pid);
        log("Fallback redirect to /spc", spcUrl);
        location.href = spcUrl;
      }
    }, 1500);
  
    // Also cancel fallback if navigation starts
    window.addEventListener("pagehide", () => setState(pid, { lastNav: Date.now() }), { once:true });
    return;
  }
}

// Observe SPA hydration
const mo = new MutationObserver(()=> {
  const pid = getPurchaseId();
  if (!pid) return;
  if (canNav(pid)) autoFlow();
});
mo.observe(document.documentElement, { childList:true, subtree:true });

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", autoFlow);
} else {
  autoFlow();
}
