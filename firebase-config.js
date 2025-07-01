// firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyBDiMnRs3xpqspu5NGnYaIC5mTYYr_17_k",
  authDomain: "voteapp-43528.firebaseapp.com",
  projectId: "voteapp-43528",
  storageBucket: "voteapp-43528.firebasestorage.app",
  messagingSenderId: "1010279949369",
  appId: "1:1010279949369:web:a3408ef46460e42e71d9e8",
  measurementId: "G-Y55FLVYL1X",
  databaseURL: "https://voteapp-43528-default-rtdb.firebaseio.com/"
};

firebase.initializeApp(firebaseConfig);
var database = firebase.database();  // For Realtime DB
