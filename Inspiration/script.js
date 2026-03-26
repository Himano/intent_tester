// Tilstand i minnet
let reviewItems = [];      // problemstillinger (2. melding per chat)
let loggedMessages = [];   // meldinger som "kunne vært contained"
let lastFileName = "";

const STORAGE_KEY = "chatReviewToolState_v2";

const fileInput = document.getElementById("fileInput");
const fileStatus = document.getElementById("fileStatus");
const chatInfo = document.getElementById("chatInfo");
const chatWindow = document.getElementById("chatWindow");
const loggedListEl = document.getElementById("loggedList");
const loggedCountBadge = document.getElementById("loggedCountBadge");
const copyLoggedBtn = document.getElementById("copyLoggedBtn");
const loggedExport = document.getElementById("loggedExport");

// --- Hjelpefunksjoner for UI ---

function clearChatWindow(message) {
  chatWindow.innerHTML = "";
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.innerHTML = `<p>${message}</p>`;
  chatWindow.appendChild(empty);
}

function updateInfoText() {
  if (reviewItems.length === 0) {
    chatInfo.textContent =
      "Ingen problemstillinger igjen å vurdere. Enten er alt gjennomgått, eller det var ingen chatter med minst 3 meldinger.";
  } else {
    chatInfo.textContent =
      `Det er ${reviewItems.length} problemstillinger igjen å vurdere ` +
      "(2. melding i hver chat med minst 3 meldinger).";
  }
}

function renderReviewList() {
  chatWindow.innerHTML = "";

  if (reviewItems.length === 0) {
    clearChatWindow("Ingen problemstillinger å vise.");
    updateInfoText();
    return;
  }

  reviewItems.forEach((item) => {
    const card = document.createElement("div");
    card.className = "message-card";

    const metaRow = document.createElement("div");
    metaRow.className = "message-meta";

    const leftMeta = document.createElement("div");
    leftMeta.style.display = "flex";
    leftMeta.style.gap = "4px";
    leftMeta.style.flexWrap = "wrap";

    const intentSpan = document.createElement("span");
    intentSpan.className = "badge message-intent-badge";
    intentSpan.textContent = item.intent || "(ingen intent)";

    const idSpan = document.createElement("span");
    idSpan.className = "badge message-id-badge";
    idSpan.textContent = "ID " + item.interactionId;

    leftMeta.appendChild(intentSpan);
    leftMeta.appendChild(idSpan);

    if (item.date) {
      const dateSpan = document.createElement("span");
      dateSpan.className = "badge";
      dateSpan.textContent = item.date;
      leftMeta.appendChild(dateSpan);
    }

    metaRow.appendChild(leftMeta);
    card.appendChild(metaRow);

    const textP = document.createElement("p");
    textP.className = "message-text";
    textP.textContent = item.message || "(tom melding)";
    card.appendChild(textP);

    // Knapper: "Denne er grei" + "Kunne vært contained"
    const actions = document.createElement("div");
    actions.className = "review-actions";

    const okBtn = document.createElement("button");
    okBtn.className = "log-btn";
    okBtn.textContent = "Denne er grei";

    const containBtn = document.createElement("button");
    containBtn.className = "log-btn primary";
    containBtn.textContent = "Kunne vært contained";

    okBtn.addEventListener("click", () => {
      // Fjern bare fra review-lista
      reviewItems = reviewItems.filter((r) => r.internalId !== item.internalId);
      renderReviewList();
      saveStateToStorage();
    });

    containBtn.addEventListener("click", () => {
      // Legg til i logg og fjern fra review-lista
      loggedMessages.push({
        interactionId: item.interactionId,
        intent: item.intent,
        message: item.message,
        date: item.date,
      });
      reviewItems = reviewItems.filter((r) => r.internalId !== item.internalId);
      renderReviewList();
      renderLoggedList();
      saveStateToStorage();
    });

    actions.appendChild(okBtn);
    actions.appendChild(containBtn);

    card.appendChild(actions);
    chatWindow.appendChild(card);
  });

  updateInfoText();
}

function renderLoggedList() {
  loggedListEl.innerHTML = "";

  if (loggedMessages.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <p>Ingen meldinger logget ennå.</p>
      <p class="helper-text">Bruk knappen «Kunne vært contained» i venstre liste for å logge.</p>
    `;
    loggedListEl.appendChild(empty);
    loggedCountBadge.textContent = "0 logget";
    copyLoggedBtn.disabled = true;
    loggedExport.value = "";
    return;
  }

  loggedMessages.forEach((msg, index) => {
    const item = document.createElement("div");
    item.className = "logged-item";

    const header = document.createElement("div");
    header.className = "logged-item-header";

    const badgesWrapper = document.createElement("div");
    badgesWrapper.className = "logged-item-badges";

    const idBadge = document.createElement("span");
    idBadge.className = "badge";
    idBadge.textContent = `ID ${msg.interactionId}`;

    const intentBadge = document.createElement("span");
    intentBadge.className = "badge";
    intentBadge.textContent = msg.intent || "(ingen intent)";

    badgesWrapper.appendChild(idBadge);
    badgesWrapper.appendChild(intentBadge);

    if (msg.date) {
      const dateBadge = document.createElement("span");
      dateBadge.className = "badge";
      dateBadge.textContent = msg.date;
      badgesWrapper.appendChild(dateBadge);
    }

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-logged-btn";
    removeBtn.textContent = "✕";
    removeBtn.title = "Fjern denne fra loggen";

    removeBtn.addEventListener("click", () => {
      loggedMessages.splice(index, 1);
      renderLoggedList();
      saveStateToStorage();
    });

    header.appendChild(badgesWrapper);
    header.appendChild(removeBtn);

    const textP = document.createElement("p");
    textP.className = "logged-item-message";
    textP.textContent = msg.message || "(tom melding)";

    item.appendChild(header);
    item.appendChild(textP);

    loggedListEl.appendChild(item);
  });

  loggedCountBadge.textContent = `${loggedMessages.length} logget`;
  copyLoggedBtn.disabled = false;

  // Eksport som ren tekst: KUN meldingen(e)
  const lines = loggedMessages.map((m) => m.message || "");
  loggedExport.value = lines.join("\n");
}

// --- LocalStorage ---

function saveStateToStorage() {
  try {
    const state = {
      reviewItems,
      loggedMessages,
      lastFileName,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Kunne ikke lagre til localStorage:", e);
  }
}

function loadStateFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    const state = JSON.parse(raw);
    if (!state || !Array.isArray(state.reviewItems)) return false;

    reviewItems = state.reviewItems || [];
    loggedMessages = state.loggedMessages || [];
    lastFileName = state.lastFileName || "";

    if (lastFileName) {
      fileStatus.textContent =
        `Gjenopprettet fra forrige sesjon: ${lastFileName} – ` +
        `${reviewItems.length} problemstillinger i kø, ` +
        `${loggedMessages.length} logget.`;
    } else {
      fileStatus.textContent =
        `Gjenopprettet fra forrige sesjon – ` +
        `${reviewItems.length} problemstillinger i kø, ` +
        `${loggedMessages.length} logget.`;
    }

    renderReviewList();
    renderLoggedList();
    return true;
  } catch (e) {
    console.warn("Kunne ikke lese fra localStorage:", e);
    return false;
  }
}

// --- Parsing av fil ---

fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  fileStatus.textContent = `Laster: ${file.name} ...`;
  lastFileName = file.name;

  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const data = e.target.result;
      let rows = [];

      if (file.name.toLowerCase().endsWith(".csv")) {
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      } else {
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      }

      if (!rows || rows.length === 0) {
        throw new Error("Fant ingen rader i filen.");
      }

      // Normaliser og plukk ut bare det vi trenger
      const normalized = rows
        .map((r) => {
          const interactionId =
            r["Interaction_id"] ??
            r["interaction_id"] ??
            r["Interaction ID"] ??
            r["Interactionid"] ??
            "";

          const intent = r["Intent"] ?? r["intent"] ?? "";
          const message = r["Message"] ?? r["message"] ?? "";

          // Forsøk å finne dato-kolonne
          let dateRaw =
            r["Date"] ??
            r["date"] ??
            r["Dato"] ??
            r["dato"] ??
            r["Timestamp"] ??
            r["timestamp"] ??
            r["Created"] ??
            r["created"] ??
            "";

          // Hvis vi ikke finner dato, kan vi evt. bruke "sort" som fallback
          if (!dateRaw && (r["sort"] ?? r["Sort"])) {
            dateRaw = r["sort"] ?? r["Sort"];
          }

          return {
            interactionId: interactionId ? String(interactionId).trim() : "",
            intent: intent ? String(intent).trim() : "",
            message: message ? String(message).trim() : "",
            date: dateRaw ? String(dateRaw).trim() : "",
          };
        })
        .filter((r) => r.interactionId); // dropp rader uten ID

      if (normalized.length === 0) {
        throw new Error(
          "Fant ingen rader med Interaction_id. Sjekk kolonnenavnene."
        );
      }

      // Sorter etter Interaction_id; prøv numerisk først
      normalized.sort((a, b) => {
        const aNum = Number(a.interactionId);
        const bNum = Number(b.interactionId);
        if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
          if (aNum === bNum) return 0;
          return aNum - bNum;
        }
        return a.interactionId.localeCompare(b.interactionId);
      });

      // Gruppér til chatter basert på Interaction_id
      let rawConversations = [];
      let currentId = normalized[0].interactionId;
      let currentMessages = [];

      for (const row of normalized) {
        if (row.interactionId === currentId) {
          currentMessages.push(row);
        } else {
          rawConversations.push({ id: currentId, messages: currentMessages });
          currentId = row.interactionId;
          currentMessages = [row];
        }
      }
      if (currentMessages.length > 0) {
        rawConversations.push({ id: currentId, messages: currentMessages });
      }

      // Filtrer bort chatter med færre enn 3 meldinger
      const filteredConversations = rawConversations.filter(
        (c) => c.messages && c.messages.length >= 3
      );

      reviewItems = [];
      loggedMessages = [];

      // For hver chat plukker vi ut 2. melding (index 1) som problemstilling
      filteredConversations.forEach((conv) => {
        if (conv.messages.length >= 2) {
          const m = conv.messages[1];
          reviewItems.push({
            internalId: `${conv.id}::1`, // enkel unik id
            interactionId: conv.id,
            intent: m.intent,
            message: m.message,
            date: m.date,
          });
        }
      });

      const totalChats = filteredConversations.length;
      const totalReview = reviewItems.length;

      if (totalReview === 0) {
        fileStatus.textContent =
          `Lastet: ${file.name}, men fant ingen chatter med minst 3 meldinger ` +
          "som hadde en 2. melding å bruke som problemstilling.";
        clearChatWindow(
          "Filen ble lest, men det var ingen relevante problemstillinger å vise."
        );
        updateInfoText();
        saveStateToStorage();
        return;
      }

      fileStatus.textContent =
        `Lastet: ${file.name} – ${totalChats} chatter med minst 3 meldinger, ` +
        `${totalReview} problemstillinger (2. melding i hver chat).`;

      renderReviewList();
      renderLoggedList();
      saveStateToStorage();
    } catch (err) {
      console.error(err);
      fileStatus.textContent = "Feil ved lesing av fil: " + err.message;
      reviewItems = [];
      loggedMessages = [];
      clearChatWindow("Kunne ikke lese filen. Sjekk at formatet stemmer.");
      updateInfoText();
      saveStateToStorage();
    }
  };

  if (file.name.toLowerCase().endsWith(".csv")) {
    reader.readAsBinaryString(file);
  } else {
    reader.readAsArrayBuffer(file);
  }
});

// Kopier loggede meldinger (kun tekst)
copyLoggedBtn.addEventListener("click", () => {
  loggedExport.select();
  document.execCommand("copy");
});

// Prøv å hente forrige tilstand fra localStorage når siden åpner
document.addEventListener("DOMContentLoaded", () => {
  const restored = loadStateFromStorage();
  if (!restored) {
    clearChatWindow("Ingen problemstillinger å vise ennå.");
    updateInfoText();
  }
});
