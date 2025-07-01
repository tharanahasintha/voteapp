// script.js
// Global variables
let currentUser = null;
let selectedCandidate = null;
let voteResults = {}; // Only if you still use it locally



// Restore currentUser from localStorage on page load
const savedUser = localStorage.getItem("currentUser");
if (savedUser) {
  currentUser = JSON.parse(savedUser);
}


// ===== MODAL CONTROL =====
function showVoterLogin() {
    document.getElementById('voter-login-modal').style.display = 'block';
}

function showAdminLogin() {
    document.getElementById('admin-login-modal').style.display = 'block';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

function closeSuccessModal() {
    document.getElementById('success-modal').style.display = 'none';
    goHome();
}

// ===== VOTER LOGIN =====
function simulateQRScan() {
    const fakeVoterID = "VOTER123";
    document.getElementById("voter-id").value = fakeVoterID;
    manualLogin();
}

function manualLogin() {
  const voterID = document.getElementById("voter-id").value.trim();
  if (!voterID) return alert("Enter voter ID!");

  database.ref("voters/" + voterID).once("value", snapshot => {
    const data = snapshot.val();
    if (!data) {
      alert("Voter not found.");
      return;
    }

    if (data.hasVoted) {
      alert("You have already voted!");
      return;
    }

    currentUser = {
      id: voterID,
      name: data.fullName || "Voter"
    };

    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    document.getElementById("voter-name").innerText = `Welcome, ${currentUser.name}`;
    closeModal("voter-login-modal");
    loadCandidates();
    document.getElementById("main-content").style.display = "none";
    document.getElementById("voting-interface").style.display = "block";
  });
}



// ===== CANDIDATES =====
function loadCandidates() {
    const list = document.getElementById("candidates-list");
    list.innerHTML = "";
    database.ref("candidates").once("value", snapshot => {
        snapshot.forEach(child => {
            const id = child.key;
            const name = child.val().name;
            const div = document.createElement("div");
            div.className = "candidate";
            div.innerHTML = `
                <input type="radio" name="candidate" value="${id}" onclick="enableVoteBtn()">
                <label>${name}</label>
            `;
            list.appendChild(div);
        });
    });
}


function registerVoter() {
    const name = document.getElementById("voter-fullname").value.trim();
    const nic = document.getElementById("voter-nic").value.trim();
    const email = document.getElementById("voter-email").value.trim();

    // Basic validation
    if (!name || !nic || !email) {
        alert("Please fill in all the fields.");
        return;
    }

    // Validate NIC (Sri Lankan format)
    const nicPattern = /^([0-9]{9}[vVxX]|[0-9]{12})$/;
    if (!nicPattern.test(nic)) {
        alert("Invalid NIC number. Enter 9 digits + V/X or 12 digits.");
        return;
    }

    // Validate email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        alert("Please enter a valid email address.");
        return;
    }

    const voterId = encodeFirebaseKey(nic);

    // Optional: Check for existing NIC
    database.ref("voters/" + voterId).once("value").then(snapshot => {
        if (snapshot.exists()) {
            alert("This NIC is already registered.");
        } else {
            // Save voter
            database.ref("voters/" + voterId).set({
                fullName: name,
                nic: nic,
                email: email
            }).then(() => {
                currentUser = {
                     id: voterId,
                     name: name
                };
                    localStorage.setItem("currentUser", JSON.stringify(currentUser));

                document.getElementById("voter-login-modal").style.display = "none";
                document.getElementById("main-content").style.display = "none";
                document.getElementById("voting-interface").style.display = "block";
                document.getElementById("voter-name").innerText = `Welcome, ${name}`;
            }).catch(error => {
                console.error("Registration failed:", error);
                alert("Error saving your data. Please try again.");
            });
        }
    });
}


function enableVoteBtn() {
    document.getElementById("submit-vote-btn").disabled = false;
}

function clearSelection() {
    document.querySelectorAll('input[name="candidate"]').forEach(r => r.checked = false);
    document.getElementById("submit-vote-btn").disabled = true;
}

// ===== VOTE SUBMISSION =====



function encodeEmail(email) {
    return email.replace(/\./g, "_").replace(/@/g, "_at_");
}

function submitVote() {
  const selectedCandidateInput = document.querySelector('input[name="candidate"]:checked');
  const selectedCandidateId = selectedCandidateInput ? selectedCandidateInput.value : null;

  if (!selectedCandidateId) {
    alert("Please select a candidate");
    return;
  }

  const submitBtn = document.getElementById("submit-vote-btn");
  const originalText = submitBtn.innerHTML;

  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
  submitBtn.disabled = true;

  firebase.database().ref(`votes/${selectedCandidateId}`).transaction((current) => {
    return (current || 0) + 1;
  }, (error, committed) => {
    if (error || !committed) {
      alert("Vote submission failed. Please try again.");
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    } else {
      // ✅ FIXED THIS BLOCK
      if (currentUser) {
        currentUser.hasVoted = true;
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
        firebase.database().ref(`voters/${currentUser.id}/hasVoted`).set(true);
      }

      document.getElementById("success-modal").style.display = "block";

      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
}





        

function showSuccessModal() {
    document.getElementById("success-modal").style.display = "block";
}



// ===== RESULTS =====
function showResults() {
    document.getElementById("main-content").style.display = "none";
    document.getElementById("results-dashboard").style.display = "block";
    refreshResults();
}

function refreshResults() {
    const chart = document.getElementById("results-chart");
    chart.innerHTML = "";

    let total = 0;
    database.ref("votes").once("value", snapshot => {
        snapshot.forEach(child => {
            const name = child.key;
            const count = child.val();
            total += count;

            const div = document.createElement("div");
            div.className = "result-bar";
            div.innerHTML = `<strong>${name}</strong>: ${count} votes`;
            chart.appendChild(div);
        });
        document.getElementById("total-votes").innerText = total;
        document.getElementById("voter-turnout").innerText = ((total / 15678432) * 100).toFixed(2) + "%";
        document.getElementById("admin-votes-cast").innerText = total;
    });
}
function goHome() {
    // Hide all sections
    document.getElementById("results-dashboard").style.display = "none";
    document.getElementById("voting-interface").style.display = "none";
    document.getElementById("admin-dashboard").style.display = "none";

    // Show main content (home page)
    document.getElementById("main-content").style.display = "block";

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}



// ===== ADMIN LOGIN =====
function adminLogin() {
    const u = document.getElementById("admin-username").value;
    const p = document.getElementById("admin-password").value;
    if (u === "admin" && p === "admin123") {
        closeModal("admin-login-modal");
        document.getElementById("main-content").style.display = "none";
        document.getElementById("admin-dashboard").style.display = "block";
        refreshResults();
    } else {
        alert("Invalid admin credentials.");
    }
}

function logout() {
    document.getElementById("admin-dashboard").style.display = "none";
    document.getElementById("voting-interface").style.display = "none";
    document.getElementById("main-content").style.display = "block";
}

// ===== ADMIN TAB SWITCH =====
function showAdminTab(tab) {
    document.querySelectorAll(".admin-tab-content").forEach(d => d.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.getElementById("admin-" + tab).classList.add("active");
    event.target.classList.add("active");
}

function showRegister() {
    closeModal("email-login-modal");
    document.getElementById("register-modal").style.display = "block";
}

function emailLogin() {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then(user => {
            alert("Login successful!");
            localStorage.setItem("voterID", email); // use email as ID
            closeModal("email-login-modal");
            loadCandidates();
            document.getElementById("main-content").style.display = "none";
            document.getElementById("voting-interface").style.display = "block";
        })
        .catch(error => {
            alert("Login failed: " + error.message);
        });
}

function registerUser() {
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;

    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then(user => {
            alert("Registered successfully! Please log in.");
            closeModal("register-modal");
            document.getElementById("email-login-modal").style.display = "block";
        })
        .catch(error => {
            alert("Registration failed: " + error.message);
        });
}
function addCandidate() {
    const name = document.getElementById("new-candidate-name").value.trim();
    if (!name) {
        alert("Please enter a candidate name.");
        return;
    }

    // Create unique candidate ID (or use push() for autogenerated)
    const candidateId = name.replace(/\s+/g, "_").toLowerCase(); // e.g., "John Doe" => "john_doe"

    database.ref("candidates/" + candidateId).set({
        name: name
    }).then(() => {
        alert("Candidate added successfully!");
        document.getElementById("new-candidate-name").value = "";
        loadCandidatesAdmin(); // Refresh list
    }).catch((error) => {
        alert("Error adding candidate: " + error.message);
    });
}
function loadCandidatesAdmin() {
    const listDiv = document.getElementById("candidates-admin-list");
    listDiv.innerHTML = "";

    database.ref("candidates").once("value", snapshot => {
        if (!snapshot.exists()) {
            listDiv.innerHTML = "<p>No candidates added yet.</p>";
            return;
        }

        snapshot.forEach(child => {
            const id = child.key;
            const name = child.val().name;

            const div = document.createElement("div");
            div.className = "admin-candidate-item";
            div.innerHTML = `
                <span>${name}</span>
                <button class="btn btn-danger" onclick="deleteCandidate('${id}')">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            listDiv.appendChild(div);
        });
    });
}
function adminLogin() {
    const u = document.getElementById("admin-username").value;
    const p = document.getElementById("admin-password").value;
    if (u === "admin" && p === "admin123") {
        closeModal("admin-login-modal");
        document.getElementById("main-content").style.display = "none";
        document.getElementById("admin-dashboard").style.display = "block";
        refreshResults();
        loadCandidatesAdmin(); // Load list
    } else {
        alert("Invalid admin credentials.");
    }
}
function deleteCandidate(id) {
    if (confirm("Are you sure you want to delete this candidate?")) {
        database.ref("candidates/" + id).remove().then(() => {
            alert("Candidate removed.");
            loadCandidatesAdmin();
        });
    }
}


//exports.sendSMS = functions.https.onCall((data, context) => {
  //const twilio = require("twilio")(accountSid, authToken);
 // return twilio.messages.create({
    //body: `Your vote has been recorded!`,
    //from: TWILIO_PHONE,
    //to: data.phone
 // });
//});