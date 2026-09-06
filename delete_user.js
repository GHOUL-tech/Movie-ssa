import { initializeApp } from "firebase/app";
import { getFirestore, doc, deleteDoc } from "firebase/firestore";
import fs from "fs";

const configRaw = fs.readFileSync("./firebase-applet-config.json", "utf8");
const firebaseConfig = JSON.parse(configRaw);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

async function run() {
  try {
    await deleteDoc(doc(db, "users", "zinovis_vip"));
    console.log("Successfully deleted zinovis_vip from Firebase");
    process.exit(0);
  } catch (err) {
    console.error("Error deleting user:", err);
    process.exit(1);
  }
}
run();
