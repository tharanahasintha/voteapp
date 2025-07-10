// ===== MODAL CONTROL =====
function showVoterLogin() {
  document.getElementById('voter-login-modal').style.display = 'block';
}

function showAdminLogin() {
  document.getElementById('admin-login-modal').style.display = 'block';
}

function showRegister() {
  closeModal('email-login-modal');
  document.getElementById('register-modal').style.display = 'block';
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
  if (id === 'voter-login-modal') stopQRScanner();
}

function closeSuccessModal() {
  document.getElementById('success-modal').style.display = 'none';
  document.getElementById('voting-interface').style.display = 'none';
  document.getElementById('main-content').style.display = 'block';
}

function showResults() {
  document.getElementById('main-content').style.display = 'none';
  document.getElementById('results-dashboard').style.display = 'block';
  refreshResults();
}

function goHome() {
  document.getElementById('results-dashboard').style.display = 'none';
  document.getElementById('main-content').style.display = 'block';
}

function logout() {
  firebase.auth().signOut().then(() => {
    window.location.reload();
  });
}

// ===== QR CODE GENERATOR FOR VOTERS & LIST DISPLAY =====
function generateVoterQRCodes() {
  const container = document.getElementById("voter-qr-container");
  container.innerHTML = "";
  const zip = new JSZip();
  const imagesFolder = zip.folder("qr-codes");

  database.ref("voters").once("value").then(snapshot => {
    const promises = [];

    snapshot.forEach(child => {
      const voterId = child.key;
      const voter = child.val();
      if (!voter.email || !voter.password) return;

      const qrData = `${voter.email},${voter.password}`;
      const voterCard = document.createElement("div");
      voterCard.className = "voter-card";
      voterCard.style.border = "1px solid #ccc";
      voterCard.style.padding = "1rem";
      voterCard.style.borderRadius = "8px";
      voterCard.style.backgroundColor = "#f9f9f9";

      const label = document.createElement("p");
      label.innerHTML = `<strong>Email:</strong> ${voter.email}<br><strong>User ID:</strong> ${voterId}<br><strong>Voted:</strong> ${voter.voted ? "Yes" : "No"}`;

      const canvas = document.createElement("canvas");
      canvas.id = `qr-${voterId}`;

      const downloadBtn = document.createElement("button");
      downloadBtn.textContent = "Download QR Code";
      downloadBtn.className = "btn btn-primary";
      downloadBtn.style.marginTop = "10px";
      downloadBtn.onclick = () => {
        const link = document.createElement("a");
        link.download = `qr-${voter.email}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      };

      voterCard.appendChild(label);
      voterCard.appendChild(canvas);
      voterCard.appendChild(downloadBtn);
      container.appendChild(voterCard);

      const promise = new Promise((resolve) => {
        QRCode.toCanvas(canvas, qrData, function (error) {
          if (error) console.error("QR generation error:", error);
          else {
            canvas.toBlob((blob) => {
              imagesFolder.file(`qr-${voter.email}.png`, blob);
              resolve();
            });
          }
        });
      });

      promises.push(promise);
    });

    Promise.all(promises).then(() => {
      const bulkDownloadBtn = document.createElement("button");
      bulkDownloadBtn.textContent = "Download All QR Codes (ZIP)";
      bulkDownloadBtn.className = "btn btn-secondary";
      bulkDownloadBtn.style.marginTop = "20px";
      bulkDownloadBtn.onclick = () => {
        zip.generateAsync({ type: "blob" }).then(function (content) {
          saveAs(content, "all-qr-codes.zip");
        });
      };
      container.prepend(bulkDownloadBtn);
    });
  });
}

// ===== REGISTRATION & LOGIN =====
function registerUser() {
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;

  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const userId = userCredential.user.uid;

      const voterData = {
        email: email,
        password: password,
        phone: '',
        voted: false
      };

      database.ref("voters/" + userId).set(voterData);
      alert("Registered successfully! Please log in.");
      closeModal("register-modal");
    })
    .catch((error) => {
      alert("Error: " + error.message);
    });
}

function emailLogin() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const userId = userCredential.user.uid;
      loadBallot(userId);
      closeModal("email-login-modal");
    })
    .catch((error) => {
      alert("Login failed: " + error.message);
    });
}






// ===== VOTING =====
function loadBallot(userId) {
  document.getElementById("voting-interface").style.display = "block";
  document.getElementById("main-content").style.display = "none";

  database.ref("voters/" + userId).once("value").then(snapshot => {
    const voter = snapshot.val();
    document.getElementById("voter-name").innerText = `Welcome, ${voter.email}`;
  });

  const candidatesList = document.getElementById("candidates-list");
  candidatesList.innerHTML = "";

  database.ref("candidates").once("value").then(snapshot => {
    snapshot.forEach(child => {
      const candidate = child.val();
      const id = child.key;

      const div = document.createElement("div");
      div.className = "candidate-card";
      div.innerHTML = `
        <input type="radio" name="candidate" value="${id}" class="candidate-radio" onclick="enableVoteBtn()">
        <div class="candidate-photo">${candidate.logo || "👤"}</div>
        <div class="candidate-info">
          <div class="candidate-name">${candidate.name}</div>
          <div class="candidate-party">${candidate.party}</div>
        </div>`;
      candidatesList.appendChild(div);
    });
  });
}

function enableVoteBtn() {
  document.getElementById("submit-vote-btn").disabled = false;
}

function submitVote() {
  const selectedCandidateId = document.querySelector('input[name="candidate"]:checked')?.value;
  const userId = firebase.auth().currentUser.uid;

  if (!selectedCandidateId) {
    alert("Please select a candidate.");
    return;
  }

  const voterRef = database.ref("voters/" + userId);

  voterRef.once("value").then(snapshot => {
    const voter = snapshot.val();

    if (voter.voted) {
      alert("You have already voted.");
      return;
    }

    database.ref("votes/" + selectedCandidateId).transaction(current => (current || 0) + 1);
    voterRef.update({ voted: true });

    sendConfirmationSMS(voter.phone || "0000000000");
    showSuccessModal();
    refreshResults();
  });
}

function sendConfirmationSMS(phone) {
  console.log("SMS sent to: " + phone);
  // Replace with actual Twilio/API call
}

function showSuccessModal() {
  document.getElementById('success-modal').style.display = 'block';
}

function clearSelection() {
  const radios = document.querySelectorAll('input[name="candidate"]');
  radios.forEach(r => r.checked = false);
  enableVoteBtn();
}

// ===== ADMIN =====
function adminLogin() {
  const username = document.getElementById("admin-username").value;
  const password = document.getElementById("admin-password").value;

  if (username === "admin" && password === "admin123") {
    document.getElementById("admin-login-modal").style.display = "none";
    document.getElementById("admin-dashboard").style.display = "block";
    document.getElementById("main-content").style.display = "none";
    loadCandidatesAdmin();
  } else {
    alert("Invalid admin credentials");
  }
}

function addCandidate() {
  const name = document.getElementById("new-candidate-name").value.trim();
  const party = document.getElementById("new-candidate-party").value.trim();
  

  if (!name || !party ) {
    alert("Please fill in all candidate details.");
    return;
  }

  const candidateId = database.ref("candidates").push().key;
  database.ref("candidates/" + candidateId).set({
    name: name,
    party: party,
    
  }).then(() => {
    alert("Candidate added successfully!");
    loadCandidatesAdmin();
    document.getElementById("new-candidate-name").value = "";
    document.getElementById("new-candidate-party").value = "";
    
  });
}

function deleteCandidate(candidateId) {
  const confirmDelete = confirm("Are you sure you want to delete this candidate?");
  if (!confirmDelete) return;

  database.ref("candidates/" + candidateId).remove()
    .then(() => {
      alert("Candidate deleted successfully!");
      loadCandidatesAdmin();
    })
    .catch((error) => {
      console.error("Delete error:", error);
      alert("Failed to delete candidate.");
    });
}


function loadCandidatesAdmin() {
  const container = document.getElementById("candidates-admin-list");
  if (!container) return;
  container.innerHTML = "";

  database.ref("candidates").once("value").then(snapshot => {
    snapshot.forEach(child => {
      const candidate = child.val();
      const candidateId = child.key;

      const card = document.createElement("div");
      card.className = "candidate-card";

      card.innerHTML = `
        
        <div class="candidate-info">
          <div class="candidate-name">${candidate.name}</div>
          <div class="candidate-party">${candidate.party}</div>
        </div>
        <button class="btn btn-danger" onclick="deleteCandidate('${candidateId}')">Delete</button>
      `;

      container.appendChild(card);
    });
  });
}

function showAdminTab(id) {
  document.querySelectorAll(".admin-tab-content").forEach(tab => tab.classList.remove("active"));
  document.getElementById("admin-" + id).classList.add("active");
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelector(`.tab-btn[onclick="showAdminTab('${id}')"]`).classList.add("active");
  if (id === "voters") generateVoterQRCodes();
}

// ===== RESULTS =====
function refreshResults() {
  const chartContainer = document.getElementById("results-chart");
  chartContainer.innerHTML = "";

  database.ref("votes").once("value").then(voteSnap => {
    database.ref("candidates").once("value").then(candidateSnap => {
      let totalVotes = 0;
      voteSnap.forEach(vote => totalVotes += vote.val());
      document.getElementById("total-votes").innerText = totalVotes;

      candidateSnap.forEach(candidate => {
        const id = candidate.key;
        const data = candidate.val();
        const votes = voteSnap.child(id).val() || 0;
        const percentage = totalVotes ? ((votes / totalVotes) * 100).toFixed(1) : 0;

        chartContainer.innerHTML += `
          <div class="result-item">
            <div class="result-candidate">
              <div class="result-name">${data.name}</div>
              <div class="result-party">${data.party}</div>
            </div>
            <div class="result-votes">
              <div class="vote-count">${votes} votes</div>
              <div class="vote-percentage">${percentage}%</div>
            </div>
            <div class="result-bar">
              <div class="result-fill" style="width: ${percentage}%;"></div>
            </div>
          </div>
        `;
      });
    });
  });
}

// ===== QR SCANNER =====
let html5QrCode;
function simulateQRScan() {
  const qrRegion = document.createElement("div");
  qrRegion.id = "qr-reader";
  document.querySelector(".qr-scanner").appendChild(qrRegion);

  const html5QrCode = new Html5Qrcode("qr-reader");
  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    (decodedText, decodedResult) => {
      html5QrCode.stop();
      const [email, password] = decodedText.split(",");

      if (!email || !password) {
        alert("QR code format is invalid.");
        return;
      }

      firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
          const userId = userCredential.user.uid;
          loadBallot(userId);
          closeModal("voter-login-modal");
        })
        .catch((error) => {
          console.error("QR login error:", error);
          alert("QR login failed: " + (error.message || "Unknown error"));
        });
    },
    (errorMessage) => {
      console.warn("QR scan error: ", errorMessage);
    }
  );
}

function stopQRScanner() {
  const qrReader = document.getElementById("qr-reader");
  if (qrReader) {
    qrReader.remove();
  }
}

