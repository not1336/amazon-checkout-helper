<p align="justify">
   
# Amazon Checkout Helper (Chrome Extension, MV3)

A lightweight Chrome extension that automatically selects **your preferred shipping address and payment card** during Amazon checkout, without changing the account defaults.  

This is especially useful for **shared Prime accounts** or business + personal cards.

---

## ✨ Features

- ✅ Auto-selects your chosen **shipping address**  
- ✅ Auto-selects your preferred **credit/debit card**  
- ✅ Works without changing your Amazon defaults (other family members aren’t affected)  
- ✅ Stores only safe identifiers (never stores full card or CVV)  

---

## ⚠️ Disclaimer

This project is for **personal use only**.  
Amazon frequently changes their checkout UI and flow, which may break this extension.  

- 🛑 **Never** store your full card number or CVV  
- 🛑 This does not bypass CVV / OTP prompts  
- 🛑 Not affiliated with Amazon in any way  

---

## 📦 Installation (Developer Mode)

1. Clone or download this repository  
2. Open **Chrome** → go to `chrome://extensions/`  
3. Toggle **Developer mode** (top right)  
4. Click **Load unpacked** and select the project folder  
5. Open the extension **Options** and set:
   - Address ID (or fragment/name)
   - Card instrument ID (or last-4/nickname)
   - Toggle `Enable auto-select`  
6. Head to Amazon checkout — the helper will do the rest 🚀  

---

## 🔎 Finding Your IDs

### Address ID
1. Go to Amazon checkout and click **Change address**  
2. Right-click the address tile → **Inspect**  
3. Look for a input with a name like: 
   `<input type="radio" name="destinationSubmissionUrl"
     value="/checkout/p/p-106-XXXX/address/shiptodestination?...&addressID=A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6&...">`
5. Copy the addressID=... part (e.g. A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6)
6. Paste this into Options → Address ID

### Card Instrument ID

1. At checkout, click Change payment method
2. Right-click your card’s radio button → Inspect
You’ll see:
`<input id="pp-1P9EmI-180" type="radio" name="ppw-instrumentRowSelection"
  value="instrumentId=0h_PU_CUS_ab12cd34-ef56-7890-ab12-cd34ef567890&isExpired=false&paymentMethod=CC&...">`
3. Copy the string after instrumentId= (e.g. 0h_PU_CUS_ab12cd34-ef56-7890-ab12-cd34ef567890)
4. Paste this into Options → Card ID

</p>
